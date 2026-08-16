"use client";

import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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
  speakInterviewText,
  stopInterviewAudio,
} from "@/app/lib/InterviewAudio";
import FinishingPhase from "./FinishingPhase";
import ThreeWaveform from "./ThreeWaveform";
import { cn } from "@/app/lib/Utils";

type InterviewStage =
  | "preparing"
  | "speaking"
  | "connecting"
  | "recording"
  | "reviewing"
  | "submitting"
  | "finishing"
  | "error";

type InterviewHistoryEntry = {
  questionId: string;
  question: string;
  answer: string;
};

const SERVER_TTS_WAIT_MS = 7_000;

async function waitForServerAudio<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Server TTS response was too slow")),
          SERVER_TTS_WAIT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

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
  const [historyEntries, setHistoryEntries] =
    useState<InterviewHistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null
  );
  const startedAtRef = useRef<number | null>(null);
  const finishInFlightRef = useRef(false);
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
      `${language}:${voiceId}:${question.id}:${question.ttsText || question.text}`,
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
  const questionTextSize = currentQuestion
    ? currentQuestion.text.length > 650
      ? "text-sm md:text-base lg:text-lg"
      : currentQuestion.text.length > 480
        ? "text-base md:text-lg lg:text-xl"
        : currentQuestion.text.length > 320
          ? "text-lg md:text-xl lg:text-2xl"
          : "text-xl md:text-2xl lg:text-3xl"
    : "text-xl md:text-2xl lg:text-3xl";
  const questionLeading =
    currentQuestion && currentQuestion.text.length > 320
      ? "leading-snug"
      : "leading-relaxed";
  const getQuestionAudio = useCallback(
    async (question: GeneratedInterviewQuestion) => {
      const key = audioKey(question);
      const cached = audioCacheRef.current.get(key);
      if (cached) return cached;
      const pending = audioRequestRef.current.get(key);
      if (pending) return pending;

      const request = aiService
        .previewTts({
          text: (question.ttsText || question.text).slice(0, 500),
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
      try {
        const data = await waitForServerAudio(getQuestionAudio(question));
        await playInterviewAudio(data.audioBase64, data.contentType);
      } catch (error) {
        console.warn("Server TTS unavailable, using browser voice:", error);
        await speakInterviewText(question.text, language);
      }
    },
    [getQuestionAudio, language]
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
    if (finishInFlightRef.current) return;
    finishInFlightRef.current = true;

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
      router.push(
        `/practice/${encodeURIComponent(practiceId)}/analysis?runId=${encodeURIComponent(runId)}`
      );
    } catch (error: unknown) {
      console.error(error);
      const responseMessage = axios.isAxiosError(error)
        ? (error.response?.data as { message?: unknown } | undefined)?.message
        : undefined;
      toast.error(
        typeof responseMessage === "string"
          ? responseMessage
          : error instanceof Error
            ? error.message
            : t("interview.evaluationFailed")
      );
      setStage("reviewing");
    } finally {
      finishInFlightRef.current = false;
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

      setHistoryEntries((previous) => {
        const entry: InterviewHistoryEntry = {
          questionId: currentQuestion.id,
          question: currentQuestion.text,
          answer: normalizedAnswer,
        };
        const existingIndex = previous.findIndex(
          (item) => item.questionId === currentQuestion.id
        );
        if (existingIndex < 0) return [...previous, entry];
        return previous.map((item, index) =>
          index === existingIndex ? entry : item
        );
      });
      setExpandedHistoryId(currentQuestion.id);
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
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      {stage === "finishing" ? (
        <motion.div
          key="finishing"
          className="h-full w-full"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, filter: "blur(14px)", scale: 1.025 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          <FinishingPhase completedSteps={finishLog.length} />
        </motion.div>
      ) : (
        <motion.div
          key="interview-session"
          className="relative flex h-full w-full select-none flex-col overflow-hidden bg-transparent text-foreground"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, filter: "blur(12px)", scale: 1.015 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <AnimatePresence initial={false}>
            {isHistoryOpen && (
              <motion.aside
                key="interview-history"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col border-r border-border/60 bg-background/95 shadow-2xl backdrop-blur-2xl"
              >
                <div className="flex h-20 shrink-0 items-center justify-between border-b border-border/50 px-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                      <h2 className="truncate text-sm font-extrabold">
                        {t("interview.historyTitle")}
                      </h2>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      {t("interview.historyProgress", {
                        answered: historyEntries.length,
                        total: questionCount,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("interview.closeHistory")}
                    title={t("interview.closeHistory")}
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
                  {historyEntries.map((entry, index) => {
                    const isExpanded = expandedHistoryId === entry.questionId;
                    return (
                      <button
                        key={entry.questionId}
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId((current) =>
                            current === entry.questionId ? null : entry.questionId
                          )
                        }
                        aria-expanded={isExpanded}
                        className={cn(
                          "w-full rounded-2xl border px-3.5 py-3 text-left transition-colors",
                          isExpanded
                            ? "border-primary/30 bg-primary/10"
                            : "border-transparent hover:border-border/60 hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-muted text-[10px] font-black text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "select-text text-xs font-bold leading-relaxed",
                                !isExpanded && "line-clamp-2"
                              )}
                            >
                              {entry.question}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-primary">
                              {t("interview.answered")}
                            </p>
                          </div>
                          <ChevronDown
                            className={cn(
                              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>

                        {isExpanded && (
                          <div className="mt-3 border-t border-border/50 pt-3">
                            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                              {t("interview.yourPreviousAnswer")}
                            </p>
                            <p className="whitespace-pre-wrap select-text text-xs leading-relaxed text-foreground/85">
                              {entry.answer}
                            </p>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  <div className="rounded-2xl border border-primary/35 bg-primary/10 px-3.5 py-3 text-left shadow-sm shadow-primary/5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground">
                        {currentStep + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-3 select-text text-xs font-bold leading-relaxed">
                          {currentQuestion.text}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-primary">
                          {t("interview.currentQuestion")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "flex h-full min-w-0 flex-1 flex-col transition-[padding] duration-300",
              isHistoryOpen && "lg:pl-80"
            )}
          >
      <header className="z-20 flex w-full shrink-0 items-center justify-between px-5 py-5 md:px-8 md:py-6">
        <div className="flex items-center gap-3">
          {!isHistoryOpen && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="mr-1 flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("interview.openHistory")}
              title={t("interview.openHistory")}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
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
            disabled={stage === "submitting"}
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

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center overflow-hidden px-5 pb-10 text-center md:px-8">
        <div className="min-h-0 w-full space-y-6">
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

          <h1
            className={`font-question mx-auto max-w-3xl px-2 select-text font-medium tracking-normal selection:bg-primary/20 ${questionLeading} ${questionTextSize}`}
          >
            {currentQuestion.text}
          </h1>

          {stage === "recording" && (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 pt-4">
              <div className="min-h-20 w-full border-t border-border/50 pt-4">
                <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                  {t("interview.liveTranscript")}
                </p>
                <p className="max-h-28 overflow-y-auto overscroll-contain pr-2 select-text text-sm leading-relaxed text-foreground/85 md:text-base">
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

              <p className="max-h-32 overflow-y-auto overscroll-contain pr-2 select-text text-sm leading-relaxed text-foreground/90 md:text-base">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
