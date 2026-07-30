"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClockCircle,
  Exit,
  MedalStar,
  Microphone,
  Restart,
  SendSquare,
  StopCircle,
} from "@solar-icons/react";
import { aiService, practiceService } from "@/app/services";
import { Spinner } from "@/app/components/ui/spinner";
import logoSrc from "@/app/assets/logo.svg";
import { useLanguage } from "@/app/hooks/useLanguage";
import {
  useRealtimeInterviewRecorder,
  type RealtimeRecordingResult,
} from "@/app/hooks/useRealtimeInterviewRecorder";
import type {
  GeneratedInterviewQuestion,
  InterviewPhaseProps,
} from "@/app/types";
import {
  playInterviewAudio,
  stopInterviewAudio,
} from "@/app/lib/InterviewAudio";
import ThreeWaveform from "./ThreeWaveform";

type InterviewStage =
  | "preparing"
  | "speaking"
  | "connecting"
  | "recording"
  | "reviewing"
  | "submitting"
  | "finishing"
  | "error";

export default function InterviewPhase({
  practiceId,
  runId,
  language,
  voiceId,
  questionsList,
  initialQuestionAudio,
  questionCount,
}: InterviewPhaseProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [questions, setQuestions] =
    useState<GeneratedInterviewQuestion[]>(questionsList);
  const [currentStep, setCurrentStep] = useState(0);
  const [stage, setStage] = useState<InterviewStage>("preparing");
  const [answer, setAnswer] = useState("");
  const [recordingResult, setRecordingResult] =
    useState<RealtimeRecordingResult | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finishLog, setFinishLog] = useState<string[]>([]);
  const [failureMessage, setFailureMessage] = useState("");
  const [questionAttempt, setQuestionAttempt] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const audioCacheRef = useRef(
    new Map<string, { audioBase64: string; contentType: string }>()
  );
  const audioRequestRef = useRef(
    new Map<
      string,
      Promise<{ audioBase64: string; contentType: string }>
    >()
  );

  const audioKey = useCallback(
    (question: GeneratedInterviewQuestion) =>
      `${language}:${voiceId}:${question.id}:${question.text}`,
    [language, voiceId]
  );

  useEffect(() => {
    const firstQuestion = questionsList[0];
    if (!initialQuestionAudio || !firstQuestion) return;
    const firstKey = audioKey(firstQuestion);
    if (!audioCacheRef.current.has(firstKey)) {
      audioCacheRef.current.set(firstKey, initialQuestionAudio);
    }
  }, [audioKey, initialQuestionAudio, questionsList]);

  const {
    liveTranscript,
    soundLevel,
    errorMessage,
    prepare: prepareRecording,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useRealtimeInterviewRecorder(runId);

  const currentQuestion = questions[currentStep];
  const getQuestionAudio = useCallback(
    async (question: GeneratedInterviewQuestion) => {
      const key = audioKey(question);
      const cached = audioCacheRef.current.get(key);
      if (cached) return cached;
      const pending = audioRequestRef.current.get(key);
      if (pending) return pending;

      const request = aiService
        .previewTts({
          text: question.text.slice(0, 500),
          language,
          voiceId,
        })
        .then((data) => {
          if (!data.audioBase64) {
            throw new Error("TTS did not return audio");
          }
          const audio = {
            audioBase64: data.audioBase64,
            contentType: data.contentType,
          };
          audioCacheRef.current.set(key, audio);
          return audio;
        })
        .finally(() => {
          audioRequestRef.current.delete(key);
        });
      audioRequestRef.current.set(key, request);
      return request;
    },
    [audioKey, language, voiceId]
  );

  const playQuestionAudio = useCallback(
    async (question: GeneratedInterviewQuestion) => {
      const data = await getQuestionAudio(question);
      await playInterviewAudio(data.audioBase64, data.contentType);
    },
    [getQuestionAudio]
  );

  useEffect(() => {
    if (!currentQuestion) return;

    let cancelled = false;
    const askQuestion = async () => {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now();
      }
      setAnswer("");
      setRecordingResult(null);
      setFailureMessage("");
      setStage("preparing");

      let preparationError: unknown;
      const recorderPreparation = prepareRecording().catch((error) => {
        preparationError = error;
      });
      try {
        setStage("speaking");
        await playQuestionAudio(currentQuestion);
      } catch (error: unknown) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : t("interview.ttsFailed");
          setFailureMessage(message);
          setStage("error");
        }
        return;
      }

      if (cancelled) return;
      setStage("connecting");
      try {
        await recorderPreparation;
        if (preparationError) {
          throw preparationError;
        }
        await startRecording();
        if (!cancelled) {
          setStage("recording");
          const nextQuestion = questions[currentStep + 1];
          if (nextQuestion) {
            void getQuestionAudio(nextQuestion).catch(() => undefined);
          }
        }
      } catch (error: unknown) {
        console.error(error);
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : t("interview.micAccessFailed");
          setFailureMessage(message);
          setStage("error");
        }
      }
    };

    void askQuestion();
    return () => {
      cancelled = true;
      stopInterviewAudio();
    };
  }, [
    currentQuestion,
    currentStep,
    getQuestionAudio,
    playQuestionAudio,
    prepareRecording,
    questionAttempt,
    questions,
    startRecording,
    t,
  ]);

  const stopCurrentRecording = useCallback(
    async () => {
      if (stage !== "recording" && stage !== "connecting") return;

      setStage("connecting");
      const result = await stopRecording();
      if (!result) {
        setStage("reviewing");
        return;
      }

      let transcript = result.transcript.trim();
      let provider = result.transcriptionProvider;
      if (!transcript && result.audio.size > 0) {
        try {
          const recovered = await aiService.transcribeAnswer(runId, result.audio);
          transcript = recovered.transcript?.trim() || "";
          provider =
            recovered.provider === "faster-whisper"
              ? "faster-whisper"
              : provider;
        } catch (error: unknown) {
          console.error("Server transcription failed:", error);
        }
      }

      setRecordingResult({
        ...result,
        transcript,
        transcriptionProvider: provider,
      });
      setAnswer(transcript);
      setStage("reviewing");
      if (currentStep + 1 < questionCount) {
        void prepareRecording().catch(() => undefined);
      }

      if (!transcript) {
        toast.warning(t("interview.transcriptMissing"));
      }
    },
    [
      currentStep,
      prepareRecording,
      questionCount,
      runId,
      stage,
      stopRecording,
      t,
    ]
  );

  const finishInterview = useCallback(async () => {
    try {
      setStage("finishing");
      setFinishLog([]);
      cancelRecording();

      const logs = [
        t("interview.finishLogNormalize"),
        t("interview.finishLogAudio"),
        t("interview.finishLogEvaluate"),
      ];
      setFinishLog(logs);

      const elapsedMinutes = Math.max(
        1,
        Math.round(
          (Date.now() - (startedAtRef.current || Date.now())) / 60_000
        )
      );
      const data = await practiceService.finishInterview(runId, {
        practiceId,
        duration: t("interview.durationMinutes", {
          minutes: elapsedMinutes,
        }),
      });

      if (!data.success) {
        throw new Error(data.message || t("interview.saveResultError"));
      }

      setFinishLog((previous) => [
        ...previous,
        t("interview.finishLogSave"),
      ]);
      toast.success(t("interview.finishSuccess"));
      router.push(
        `/practice/${encodeURIComponent(practiceId)}/analysis?runId=${encodeURIComponent(runId)}`
      );
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("interview.evaluationFailed")
      );
      setStage("reviewing");
    }
  }, [cancelRecording, practiceId, router, runId, t]);

  const submitAnswer = useCallback(async () => {
    const normalizedAnswer = answer.trim();
    if (!currentQuestion || !normalizedAnswer) {
      toast.error(t("interview.answerRequired"));
      return;
    }

    try {
      setStage("submitting");
      const response = await aiService.submitInterviewAnswer(runId, {
        questionId: currentQuestion.id,
        answer: normalizedAnswer,
        audio: recordingResult?.audio,
        durationSec: recordingResult?.durationSec,
        assemblySessionId: recordingResult?.assemblySessionId,
        transcriptionProvider:
          recordingResult?.transcriptionProvider || "manual",
      });

      if (!response.success) {
        throw new Error(response.message || t("interview.saveResultError"));
      }

      setAnsweredCount(response.answeredCount);
      if (response.completed || !response.nextQuestion) {
        await finishInterview();
        return;
      }

      setQuestions((previous) => {
        const next = response.nextQuestion as GeneratedInterviewQuestion;
        const existingIndex = previous.findIndex(
          (question) => question.id === next.id
        );
        if (existingIndex >= 0) {
          return previous.map((question, index) =>
            index === existingIndex ? next : question
          );
        }
        return [...previous, next];
      });
      void getQuestionAudio(response.nextQuestion).catch(() => undefined);
      setCurrentStep(response.answeredCount);
      setStage("preparing");
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : t("interview.saveResultError")
      );
      setStage("reviewing");
    }
  }, [
    answer,
    currentQuestion,
    finishInterview,
    getQuestionAudio,
    recordingResult,
    runId,
    t,
  ]);

  const reRecord = useCallback(async () => {
    setAnswer("");
    setRecordingResult(null);
    setStage("connecting");
    try {
      await startRecording();
      setStage("recording");
    } catch (error: unknown) {
      console.error(error);
      setFailureMessage(
        error instanceof Error ? error.message : t("interview.micAccessFailed")
      );
      setStage("error");
    }
  }, [startRecording, t]);

  const retryCurrentQuestion = useCallback(() => {
    cancelRecording();
    setFailureMessage("");
    setQuestionAttempt((previous) => previous + 1);
  }, [cancelRecording]);

  if (!currentQuestion) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full select-none flex-col overflow-hidden bg-background text-foreground">
      <header className="z-20 flex w-full shrink-0 items-center justify-between px-5 py-5 md:px-8 md:py-6">
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-8 w-8 items-center justify-center transition-transform duration-100"
            style={{
              transform: `scale(${
                stage === "recording" || stage === "speaking"
                  ? 1 + (soundLevel / 100) * 0.16
                  : 1
              })`,
            }}
          >
            <Image
              src={logoSrc}
              alt="InterV"
              width={32}
              height={32}
              className="object-contain invert dark:invert-0"
              priority
            />
          </div>
          <span className="font-logo text-2xl font-bold tracking-normal">
            InterV<span className="text-[var(--chart-1)]">.</span>
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-5">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <ClockCircle
              className="h-4 w-4 text-primary"
              weight="BoldDuotone"
              aria-hidden="true"
            />
            <span>
              {t("interview.questionProgress", {
                current: Math.min(currentStep + 1, questionCount),
                total: questionCount,
              })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void finishInterview()}
            disabled={stage === "finishing" || stage === "submitting"}
            className="text-muted-foreground transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={
              answeredCount > 0
                ? t("interview.submitAndGrade")
                : t("interview.finishEarly")
            }
            title={
              answeredCount > 0
                ? t("interview.submitAndGrade")
                : t("interview.finishEarly")
            }
          >
            {answeredCount > 0 ? (
              <MedalStar className="h-5 w-5" weight="BoldDuotone" />
            ) : (
              <Exit className="h-5 w-5" weight="BoldDuotone" />
            )}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-10 text-center md:px-8">
        <div className="w-full space-y-6">
          <div className="flex min-h-8 items-center justify-center">
            {stage === "preparing" || stage === "submitting" ? (
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Spinner className="h-4 w-4" />
                <span>
                  {stage === "submitting"
                    ? t("interview.savingAnswer")
                    : t("interview.aiPreparing")}
                </span>
              </div>
            ) : stage === "speaking" ? (
              <span className="text-xs font-bold text-primary">
                {t("interview.aiSpeaking")}
              </span>
            ) : stage === "connecting" ? (
              <span className="text-xs font-bold text-muted-foreground">
                {t("interview.connectingMic")}
              </span>
            ) : stage === "error" ? (
              <span className="text-xs font-bold text-red-400">
                {t("interview.requiredServiceError")}
              </span>
            ) : null}
          </div>

          <h1 className="font-question mx-auto max-w-3xl select-text text-xl font-medium leading-relaxed tracking-normal selection:bg-primary/20 md:text-2xl lg:text-3xl">
            {currentQuestion.text}
          </h1>

          {stage === "recording" && (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span>{t("interview.recording")}</span>
              </div>

              <div className="min-h-20 w-full border-t border-border/50 pt-4">
                <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                  {t("interview.liveTranscript")}
                </p>
                <p className="select-text text-sm leading-relaxed text-foreground/85 md:text-base">
                  {liveTranscript || t("interview.listening")}
                </p>
              </div>

              {errorMessage && (
                <p className="text-xs text-amber-500">{errorMessage}</p>
              )}

              <button
                type="button"
                onClick={() => void stopCurrentRecording()}
                className="flex h-11 items-center gap-2 rounded-full bg-red-500 px-6 text-xs font-bold text-white transition-colors hover:bg-red-600"
              >
                <StopCircle
                  className="h-4 w-4"
                  weight="BoldDuotone"
                  aria-hidden="true"
                />
                <span>{t("interview.doneAnswering")}</span>
              </button>
            </div>
          )}

          {stage === "reviewing" && (
            <div className="mx-auto w-full max-w-2xl border-t border-border/50 pt-5 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  {t("interview.answerTranscript")}
                </p>
              </div>

              <p className="select-text text-sm leading-relaxed text-foreground/90 md:text-base">
                {answer || t("interview.answerPlaceholder")}
              </p>

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void reRecord()}
                  className="flex h-10 items-center gap-2 rounded-full bg-muted px-5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <Microphone
                    className="h-4 w-4"
                    weight="BoldDuotone"
                    aria-hidden="true"
                  />
                  <span>{t("interview.reRecord")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void submitAnswer()}
                  disabled={!answer.trim()}
                  className="flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-xs font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SendSquare
                    className="h-4 w-4"
                    weight="BoldDuotone"
                    aria-hidden="true"
                  />
                  <span>{t("interview.sendAnswer")}</span>
                </button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 border-t border-border/50 pt-5">
              <p className="select-text text-sm leading-relaxed text-red-400">
                {failureMessage || t("interview.requiredServiceError")}
              </p>
              <button
                type="button"
                onClick={retryCurrentQuestion}
                className="flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-xs font-black text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Restart
                  className="h-4 w-4"
                  weight="BoldDuotone"
                  aria-hidden="true"
                />
                <span>{t("interview.retryQuestion")}</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <ThreeWaveform
        soundLevel={stage === "speaking" ? 42 : soundLevel}
        isActive={stage === "recording" || stage === "speaking"}
      />

      {stage === "finishing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-6 backdrop-blur-xl">
          <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full border border-primary/20 opacity-75" />
              <Spinner className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">
                {t("interview.finishingTitle")}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("interview.finishingDescription")}
              </p>
            </div>
            <div className="max-h-36 w-full overflow-y-auto rounded-lg border border-border bg-muted/40 p-4 text-left font-mono text-[10px] text-emerald-400">
              {finishLog.map((log) => (
                <div key={log} className="mb-1.5 flex gap-2">
                  <span className="text-primary">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
