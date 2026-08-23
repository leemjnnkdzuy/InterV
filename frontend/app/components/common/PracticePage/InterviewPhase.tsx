"use client";

import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageSquareText,
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
import { Textarea } from "@/app/components/ui/textarea";
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
import { getInterviewVoiceName } from "@/app/lib/InterviewVoice";
import FinishingPhase from "./FinishingPhase";
import ThreeWaveform from "./ThreeWaveform";

type InterviewStage =
  | "preparing"
  | "openingSpeaking"
  | "openingConnecting"
  | "openingRecording"
  | "openingReviewing"
  | "openingSubmitting"
  | "speaking"
  | "connecting"
  | "recording"
  | "reviewing"
  | "submitting"
  | "closing"
  | "finishing"
  | "error";

const SERVER_TTS_WAIT_MS = 45_000;

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
  voiceName,
  language,
  voiceId,
  initialOpeningAudio,
  questionsList,
  initialQuestionAudio,
  questionCount,
  autoTurnTaking,
  textAnswerEnabled,
}: InterviewPhaseProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [questions, setQuestions] =
    useState<GeneratedInterviewQuestion[]>(questionsList);
  const [currentStep, setCurrentStep] = useState(0);
  const [openingCompleted, setOpeningCompleted] = useState(false);
  const [openingAttempt, setOpeningAttempt] = useState(0);
  const [stage, setStage] = useState<InterviewStage>("preparing");
  const [promptAudioReady, setPromptAudioReady] = useState(false);
  const [autoSubmissionPending, setAutoSubmissionPending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerInputMode, setAnswerInputMode] = useState<"voice" | "text">(
    "voice"
  );
  const textOnlyModeRef = useRef(false);
  const [recordingResult, setRecordingResult] =
    useState<RealtimeRecordingResult | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [finishingStep, setFinishingStep] = useState(0);
  const [failureMessage, setFailureMessage] = useState("");
  const [questionAttempt, setQuestionAttempt] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const finishInFlightRef = useRef(false);
  const autoFinalizedTurnRef = useRef("");
  const autoSubmittedAnswerRef = useRef("");
  const autoSubmissionRetryRef = useRef({ key: "", count: 0 });
  const autoStopInFlightRef = useRef(false);
  const transitionGenerationRef = useRef(0);
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
      `${language}:${voiceId}:${question.id}:${question.spokenText || question.ttsText || question.text}`,
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
    status: recorderStatus,
    liveTranscript,
    soundLevel,
    errorMessage,
    finalTurn,
    getActiveSegmentId,
    prepare: prepareRecording,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useRealtimeInterviewRecorder(runId, {
    autoTurnTaking,
    languageCode: language,
    persistentSession: autoTurnTaking,
  });

  const currentQuestion = questions[currentStep];
  const interviewerName = getInterviewVoiceName(voiceName);
  const openingPrompt = t("interview.openingPrompt", {
    voice: interviewerName || t("interview.defaultInterviewerName"),
  });
  const closingPrompt = t("interview.closingPrompt");
  const displayPrompt =
    stage === "closing"
      ? closingPrompt
      : openingCompleted
        ? promptAudioReady
          ? currentQuestion?.text
          : ""
        : promptAudioReady
          ? openingPrompt
          : "";
  const questionTextSize = displayPrompt
    ? displayPrompt.length > 650
      ? "text-sm md:text-base lg:text-lg"
      : displayPrompt.length > 480
        ? "text-base md:text-lg lg:text-xl"
        : displayPrompt.length > 320
          ? "text-lg md:text-xl lg:text-2xl"
          : "text-xl md:text-2xl lg:text-3xl"
    : "text-xl md:text-2xl lg:text-3xl";
  const questionLeading =
    displayPrompt && displayPrompt.length > 320
      ? "leading-snug"
      : "leading-relaxed";
  const isRecordingStage =
    stage === "recording" || stage === "openingRecording";
  const isSubmittingStage =
    stage === "submitting" || stage === "openingSubmitting";
  const isAutoReviewPending =
    autoTurnTaking &&
    autoSubmissionPending &&
    (stage === "reviewing" || stage === "openingReviewing");
  const showRealtimeTranscript =
    isRecordingStage || isSubmittingStage || isAutoReviewPending;
  const realtimeTranscriptLabel = isSubmittingStage
    ? stage === "openingSubmitting"
      ? t("interview.openingSaving")
      : t("interview.savingAnswer")
    : isAutoReviewPending
      ? stage === "openingReviewing"
        ? t("interview.openingSaving")
        : t("interview.savingAnswer")
      : openingCompleted
        ? t("interview.liveTranscript")
        : t("interview.openingTranscript");
  const getQuestionAudio = useCallback(
    async (question: GeneratedInterviewQuestion) => {
      const key = audioKey(question);
      const cached = audioCacheRef.current.get(key);
      if (cached) return cached;
      const pending = audioRequestRef.current.get(key);
      if (pending) return pending;

      const request = aiService
        .previewTts({
          text: (
            question.spokenText ||
            question.ttsText ||
            question.text
          ).slice(0, 1_200),
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
      const data = await waitForServerAudio(getQuestionAudio(question));
      await playInterviewAudio(data.audioBase64, data.contentType, () =>
        setPromptAudioReady(true)
      );
    },
    [getQuestionAudio]
  );

  const playPromptAudio = useCallback(
    async (
      text: string,
      preparedAudio?: { audioBase64: string; contentType: string }
    ) => {
      const data =
        preparedAudio ||
        (await waitForServerAudio(
          aiService.previewTts({
            text: text.slice(0, 1_200),
            language,
            voiceId,
          })
        ));
      if (!data.audioBase64) throw new Error("TTS did not return audio");
      await playInterviewAudio(data.audioBase64, data.contentType, () =>
        setPromptAudioReady(true)
      );
    },
    [language, voiceId]
  );

  useEffect(() => {
    if (openingCompleted) return;

    let cancelled = false;
    const transitionGeneration = transitionGenerationRef.current;
    const startOpening = async () => {
      const textOnlyMode = textOnlyModeRef.current;
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      autoFinalizedTurnRef.current = "";
      autoSubmittedAnswerRef.current = "";
      autoSubmissionRetryRef.current = { key: "", count: 0 };
      autoStopInFlightRef.current = false;
      setAnswer("");
      setAnswerInputMode(textOnlyMode ? "text" : "voice");
      setRecordingResult(null);
      setFailureMessage("");
      setPromptAudioReady(false);
      setAutoSubmissionPending(false);

      let preparationError: unknown;
      const recorderPreparation = textOnlyMode
        ? Promise.resolve()
        : prepareRecording().catch((error) => {
            preparationError = error;
          });
      try {
        setStage("openingSpeaking");
        await playPromptAudio(openingPrompt, initialOpeningAudio);
        if (
          cancelled ||
          transitionGeneration !== transitionGenerationRef.current
        ) {
          return;
        }

        setStage("openingConnecting");
        await recorderPreparation;
        if (preparationError) throw preparationError;
        if (
          cancelled ||
          transitionGeneration !== transitionGenerationRef.current
        ) {
          return;
        }
        if (textOnlyMode) {
          setStage("openingReviewing");
          return;
        }
        // Small cooldown so speaker sound clears from the microphone before recording
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (
          cancelled ||
          transitionGeneration !== transitionGenerationRef.current
        ) {
          return;
        }
        await startRecording();
        if (
          !cancelled &&
          transitionGeneration === transitionGenerationRef.current
        ) {
          setStage("openingRecording");
        }
      } catch (error: unknown) {
        console.error(error);
        if (
          !cancelled &&
          transitionGeneration === transitionGenerationRef.current
        ) {
          setFailureMessage(
            error instanceof Error ? error.message : t("interview.micAccessFailed")
          );
          setStage("error");
        }
      }
    };

    void startOpening();
    return () => {
      cancelled = true;
      stopInterviewAudio();
    };
  }, [
    openingAttempt,
    openingCompleted,
    openingPrompt,
    playPromptAudio,
    prepareRecording,
    startRecording,
    t,
    initialOpeningAudio,
  ]);

  useEffect(() => {
    if (!openingCompleted || !currentQuestion) return;

    let cancelled = false;
    const transitionGeneration = transitionGenerationRef.current;
    const askQuestion = async () => {
      const textOnlyMode = textOnlyModeRef.current;
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now();
      }
      autoFinalizedTurnRef.current = "";
      autoSubmittedAnswerRef.current = "";
      autoSubmissionRetryRef.current = { key: "", count: 0 };
      autoStopInFlightRef.current = false;
      setAnswer("");
      setAnswerInputMode(textOnlyMode ? "text" : "voice");
      setRecordingResult(null);
      setFailureMessage("");
      setPromptAudioReady(false);
      setAutoSubmissionPending(false);
      setStage("preparing");

      let preparationError: unknown;
      const recorderPreparation = textOnlyMode
        ? Promise.resolve()
        : prepareRecording().catch((error) => {
            preparationError = error;
          });
      try {
        setStage("speaking");
        await playQuestionAudio(currentQuestion);
      } catch (error: unknown) {
        if (
          !cancelled &&
          transitionGeneration === transitionGenerationRef.current
        ) {
          const message =
            error instanceof Error ? error.message : t("interview.ttsFailed");
          setFailureMessage(message);
          setStage("error");
        }
        return;
      }

      if (
        cancelled ||
        transitionGeneration !== transitionGenerationRef.current
      ) {
        return;
      }
      setStage("connecting");
      try {
        await recorderPreparation;
        if (preparationError) {
          throw preparationError;
        }
        if (
          cancelled ||
          transitionGeneration !== transitionGenerationRef.current
        ) {
          return;
        }
        if (textOnlyMode) {
          setStage("reviewing");
          return;
        }
        // Small cooldown so speaker sound clears from the microphone before recording
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (
          cancelled ||
          transitionGeneration !== transitionGenerationRef.current
        ) {
          return;
        }
        await startRecording();
        if (
          !cancelled &&
          transitionGeneration === transitionGenerationRef.current
        ) {
          setStage("recording");
          for (const upcomingQuestion of questions.slice(
            currentStep + 1,
            currentStep + 3
          )) {
            void getQuestionAudio(upcomingQuestion).catch(() => undefined);
          }
        }
      } catch (error: unknown) {
        console.error(error);
        if (
          !cancelled &&
          transitionGeneration === transitionGenerationRef.current
        ) {
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
    openingCompleted,
    playQuestionAudio,
    prepareRecording,
    questionAttempt,
    questions,
    startRecording,
    t,
  ]);

  const stopOpeningRecording = useCallback(async () => {
    if (stage !== "openingRecording" && stage !== "openingConnecting") return;

    const transitionGeneration = transitionGenerationRef.current;
    setStage("openingConnecting");
    const result = await stopRecording();
    if (transitionGeneration !== transitionGenerationRef.current) return;
    if (!result) {
      setStage("openingReviewing");
      return;
    }

    // In real-interview mode the microphone and STT socket remain warm for
    // the next question. Manual mode still prewarms a fresh session here.
    void prepareRecording().catch((error) => {
      console.warn("Could not prewarm the first answer recorder:", error);
    });

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
      } catch (error) {
        console.error("Server opening transcription failed:", error);
      }
    }
    if (transitionGeneration !== transitionGenerationRef.current) return;

    setRecordingResult({
      ...result,
      transcript,
      transcriptionProvider: provider,
    });
    setAnswer(transcript);
    if (!transcript && textAnswerEnabled) {
      setAnswerInputMode("text");
    }
    setAutoSubmissionPending(autoTurnTaking && Boolean(transcript.trim()));
    setStage("openingReviewing");
    if (!transcript) toast.warning(t("interview.transcriptMissing"));
  }, [
    autoTurnTaking,
    prepareRecording,
    runId,
    stage,
    stopRecording,
    t,
    textAnswerEnabled,
  ]);

  const stopCurrentRecording = useCallback(
    async () => {
      if (stage !== "recording" && stage !== "connecting") return;

      const transitionGeneration = transitionGenerationRef.current;
      setStage("connecting");
      const result = await stopRecording();
      if (transitionGeneration !== transitionGenerationRef.current) return;
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
      if (transitionGeneration !== transitionGenerationRef.current) return;

      setRecordingResult({
        ...result,
        transcript,
        transcriptionProvider: provider,
      });
      setAnswer(transcript);
    if (!transcript && textAnswerEnabled) {
      setAnswerInputMode("text");
    }
    setAutoSubmissionPending(autoTurnTaking);
    setStage("reviewing");
      if (currentStep + 1 < questionCount) {
        void prepareRecording().catch(() => undefined);
      }

      if (!transcript) {
        toast.warning(t("interview.transcriptMissing"));
      }
    },
    [
      autoTurnTaking,
      currentStep,
      prepareRecording,
      questionCount,
      runId,
      stage,
      stopRecording,
      t,
      textAnswerEnabled,
    ]
  );

  useEffect(() => {
    if (!autoTurnTaking || !finalTurn) return;
    if (stage !== "recording" && stage !== "openingRecording") return;
    if (
      typeof finalTurn.segmentId === "number" &&
      finalTurn.segmentId !== getActiveSegmentId()
    ) {
      return;
    }

    const trimmedTranscript = finalTurn.transcript?.trim() || "";
    const words = trimmedTranscript.split(/\s+/).filter(Boolean);
    if (words.length < 1 || (words.length === 1 && trimmedTranscript.length < 3)) {
      return;
    }

    const turnKey = `${finalTurn.turnOrder ?? "unknown"}:${trimmedTranscript}`;
    if (autoFinalizedTurnRef.current === turnKey) return;
    autoFinalizedTurnRef.current = turnKey;

    const timeoutId = window.setTimeout(() => {
      if (autoStopInFlightRef.current) return;
      autoStopInFlightRef.current = true;
      void (openingCompleted
        ? stopCurrentRecording()
        : stopOpeningRecording()).finally(() => {
        autoStopInFlightRef.current = false;
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    autoTurnTaking,
    finalTurn,
    getActiveSegmentId,
    openingCompleted,
    stage,
    stopCurrentRecording,
    stopOpeningRecording,
  ]);

  useEffect(() => {
    if (
      recorderStatus !== "error" ||
      (stage !== "recording" && stage !== "openingRecording")
    ) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFailureMessage(errorMessage || t("interview.micAccessFailed"));
      setStage("error");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [errorMessage, recorderStatus, stage, t]);

  const submitOpening = useCallback(async () => {
    const normalizedAnswer = answer.trim();
    if (!normalizedAnswer) {
      toast.error(t("interview.answerRequired"));
      return;
    }

    let answerAccepted = false;
    try {
      setStage("openingSubmitting");
      const response = await practiceService.submitOpening(runId, {
        prompt: openingPrompt,
        transcript: normalizedAnswer,
        durationSec: recordingResult?.durationSec,
        assemblySessionId: recordingResult?.assemblySessionId,
        transcriptionProvider:
          recordingResult?.transcriptionProvider || "manual",
      });
      if (!response.success) {
        throw new Error(response.message || t("interview.saveResultError"));
      }
      answerAccepted = true;
      setAutoSubmissionPending(false);
      if (response.nextQuestion) {
        setQuestions((previous) =>
          previous.map((question, index) =>
            index === 0
              ? {
                  ...question,
                  ...response.nextQuestion,
                }
            : question
          )
        );
        if (response.nextQuestionAudio) {
          audioCacheRef.current.set(
            audioKey(response.nextQuestion),
            response.nextQuestionAudio
          );
        }
      }
      setOpeningCompleted(true);
      setAnswer("");
      setAnswerInputMode("voice");
      setRecordingResult(null);
      setPromptAudioReady(false);
      setStage("preparing");
    } catch (error: unknown) {
      console.error(error);
      const submissionKey = `opening:${normalizedAnswer}`;
      if (
        !answerAccepted &&
        autoSubmissionRetryRef.current.key === submissionKey &&
        autoSubmissionRetryRef.current.count < 1
      ) {
        autoSubmissionRetryRef.current.count += 1;
        autoSubmittedAnswerRef.current = "";
      }
      toast.error(
        error instanceof Error ? error.message : t("interview.saveResultError")
      );
      setAutoSubmissionPending(false);
      setStage("openingReviewing");
    }
  }, [answer, audioKey, openingPrompt, recordingResult, runId, t]);

  const finishInterview = useCallback(async (withClosing = false) => {
    if (finishInFlightRef.current) return;
    finishInFlightRef.current = true;
    transitionGenerationRef.current += 1;
    stopInterviewAudio();

    try {
      setStage(withClosing ? "closing" : "finishing");
      setFinishingStep(1);
      cancelRecording();

      const elapsedMinutes = Math.max(
        1,
        Math.round(
          (Date.now() - (startedAtRef.current || Date.now())) / 60_000
        )
      );
      const evaluationRequest = practiceService.finishInterview(runId, {
        practiceId,
        duration: t("interview.durationMinutes", {
          minutes: elapsedMinutes,
        }),
      });
      let data;
      if (withClosing) {
        const closingAudioRequest = playPromptAudio(closingPrompt).catch(
          (error) => {
            console.warn("Closing TTS unavailable:", error);
          }
        );
        await closingAudioRequest;
        setStage("finishing");
        setFinishingStep(2);
        data = await evaluationRequest;
      } else {
        setStage("finishing");
        setFinishingStep(2);
        data = await evaluationRequest;
      }

      if (!data.success) {
        throw new Error(data.message || t("interview.saveResultError"));
      }

      setFinishingStep(4);
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
  }, [
    cancelRecording,
    closingPrompt,
    playPromptAudio,
    practiceId,
    router,
    runId,
    t,
  ]);

  const submitAnswer = useCallback(async () => {
    const normalizedAnswer = answer.trim();
    if (!currentQuestion || !normalizedAnswer) {
      toast.error(t("interview.answerRequired"));
      return;
    }

    let answerAccepted = false;
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
      answerAccepted = true;

      setAnsweredCount(response.answeredCount);
      if (response.completed || !response.nextQuestion) {
        setAutoSubmissionPending(false);
        await finishInterview(true);
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
      setAutoSubmissionPending(false);
      setStage("preparing");
    } catch (error: unknown) {
      console.error(error);
      const submissionKey = `${currentQuestion.id}:${normalizedAnswer}`;
      if (
        !answerAccepted &&
        autoSubmissionRetryRef.current.key === submissionKey &&
        autoSubmissionRetryRef.current.count < 1
      ) {
        autoSubmissionRetryRef.current.count += 1;
        autoSubmittedAnswerRef.current = "";
      }
      toast.error(
        error instanceof Error ? error.message : t("interview.saveResultError")
      );
      setAutoSubmissionPending(false);
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

  useEffect(() => {
    if (
      !autoTurnTaking ||
      answerInputMode !== "voice" ||
      !answer.trim() ||
      (stage !== "reviewing" && stage !== "openingReviewing")
    ) {
      return;
    }

    const normalized = answer.trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length < 1 || (words.length === 1 && normalized.length < 3)) {
      return;
    }

    const scope = openingCompleted ? currentQuestion?.id : "opening";
    if (!scope) return;
    const submissionKey = `${scope}:${normalized}`;
    if (autoSubmissionRetryRef.current.key !== submissionKey) {
      autoSubmissionRetryRef.current = { key: submissionKey, count: 0 };
    }
    if (autoSubmittedAnswerRef.current === submissionKey) return;
    autoSubmittedAnswerRef.current = submissionKey;

    const timeoutId = window.setTimeout(() => {
      void (openingCompleted ? submitAnswer() : submitOpening());
    }, 600);
    return () => window.clearTimeout(timeoutId);
  }, [
    answer,
    answerInputMode,
    autoTurnTaking,
    currentQuestion,
    openingCompleted,
    stage,
    submitAnswer,
    submitOpening,
  ]);

  const reRecord = useCallback(async () => {
    textOnlyModeRef.current = false;
    const transitionGeneration = ++transitionGenerationRef.current;
    stopInterviewAudio();
    setAnswer("");
    setAnswerInputMode("voice");
    setRecordingResult(null);
    setAutoSubmissionPending(false);
    setStage(openingCompleted ? "connecting" : "openingConnecting");
    try {
      await startRecording();
      if (transitionGeneration !== transitionGenerationRef.current) return;
      setStage(openingCompleted ? "recording" : "openingRecording");
    } catch (error: unknown) {
      console.error(error);
      if (transitionGeneration !== transitionGenerationRef.current) return;
      setFailureMessage(
        error instanceof Error ? error.message : t("interview.micAccessFailed")
      );
      setStage("error");
    }
  }, [openingCompleted, startRecording, t]);

  const switchToTextAnswer = useCallback((forceTextOnly = false) => {
    if (!textAnswerEnabled) return;
    if (forceTextOnly) textOnlyModeRef.current = true;
    transitionGenerationRef.current += 1;
    stopInterviewAudio();
    cancelRecording();
    setAnswer("");
    setRecordingResult(null);
    setAnswerInputMode("text");
    setAutoSubmissionPending(false);
    setStage(openingCompleted ? "reviewing" : "openingReviewing");
  }, [cancelRecording, openingCompleted, textAnswerEnabled]);

  const retryCurrentQuestion = useCallback(() => {
    transitionGenerationRef.current += 1;
    stopInterviewAudio();
    cancelRecording();
    setFailureMessage("");
    setAutoSubmissionPending(false);
    if (openingCompleted) {
      setQuestionAttempt((previous) => previous + 1);
    } else {
      setOpeningAttempt((previous) => previous + 1);
    }
  }, [cancelRecording, openingCompleted]);

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
          <FinishingPhase completedSteps={finishingStep} />
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
          <div className="flex h-full min-w-0 flex-1 flex-col">
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
              {openingCompleted
                ? t("interview.questionProgress", {
                    current: Math.min(currentStep + 1, questionCount),
                    total: questionCount,
                  })
                : t("interview.openingProgress")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void finishInterview()}
            disabled={
              !openingCompleted ||
              [
                "submitting",
                "openingSpeaking",
                "openingConnecting",
                "openingRecording",
                "openingReviewing",
                "openingSubmitting",
                "closing",
              ].includes(stage)
            }
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
            {stage === "error" ? (
              <span className="text-xs font-bold text-red-400">
                {t("interview.requiredServiceError")}
              </span>
            ) : null}
          </div>

          <h1
            className={`font-question mx-auto max-w-3xl px-2 select-text font-medium tracking-normal selection:bg-primary/20 ${questionLeading} ${questionTextSize}`}
          >
            {displayPrompt}
          </h1>

          {showRealtimeTranscript && (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 pt-4">
              <div className="min-h-20 w-full border-t border-border/50 pt-4">
                <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">
                  {realtimeTranscriptLabel}
                </p>
                <p className="max-h-28 overflow-y-auto overscroll-contain pr-2 select-text text-sm leading-relaxed text-foreground/85 md:text-base">
                  {answer || liveTranscript || (
                    <span className="italic text-muted-foreground/50">
                      {openingCompleted ? t("interview.listening") : t("interview.openingListening")}
                    </span>
                  )}
                </p>
              </div>

              {errorMessage && (
                <p className="text-xs text-amber-500">{errorMessage}</p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                {isRecordingStage && textAnswerEnabled && (
                  <button
                    type="button"
                    onClick={() => switchToTextAnswer()}
                    className="flex h-10 items-center gap-2 rounded-full bg-muted px-5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                    <span>{t("interview.typeAnswer")}</span>
                  </button>
                )}
                {isRecordingStage && !autoTurnTaking && (
                  <button
                    type="button"
                    onClick={() =>
                      void (openingCompleted
                        ? stopCurrentRecording()
                        : stopOpeningRecording())
                    }
                    className="flex h-11 items-center gap-2 rounded-full bg-red-500 px-6 text-xs font-bold text-white transition-colors hover:bg-red-600"
                  >
                    <StopCircle
                      className="h-4 w-4"
                      weight="BoldDuotone"
                      aria-hidden="true"
                    />
                    <span>{t("interview.doneAnswering")}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {(stage === "reviewing" || stage === "openingReviewing") &&
            (!autoTurnTaking || !autoSubmissionPending) && (
            <div className="mx-auto w-full max-w-2xl border-t border-border/50 pt-5 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  {openingCompleted
                    ? t("interview.answerTranscript")
                    : t("interview.openingTranscript")}
                </p>
              </div>

              {answerInputMode === "text" ? (
                <Textarea
                  autoFocus
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={t("interview.textAnswerPlaceholder")}
                  className="min-h-32 resize-y rounded-2xl border-border/50 bg-background/40 text-sm leading-relaxed md:text-base"
                />
              ) : (
                <p className="max-h-32 overflow-y-auto overscroll-contain pr-2 select-text text-sm leading-relaxed text-foreground/90 md:text-base">
                  {answer || t("interview.answerPlaceholder")}
                </p>
              )}

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
                  <span>
                    {answerInputMode === "text"
                      ? t("interview.voiceAnswer")
                      : t("interview.reRecord")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void (openingCompleted ? submitAnswer() : submitOpening())
                  }
                  disabled={!answer.trim()}
                  className="flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-xs font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SendSquare
                    className="h-4 w-4"
                    weight="BoldDuotone"
                    aria-hidden="true"
                  />
                  <span>
                    {openingCompleted
                      ? t("interview.sendAnswer")
                      : t("interview.openingSend")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 border-t border-border/50 pt-5">
              <p className="select-text text-sm leading-relaxed text-red-400">
                {failureMessage || t("interview.requiredServiceError")}
              </p>
              {textAnswerEnabled && (
                <button
                  type="button"
                  onClick={() => switchToTextAnswer(true)}
                  className="flex h-10 items-center gap-2 rounded-full bg-muted px-5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                  <span>{t("interview.typeAnswer")}</span>
                </button>
              )}
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
        soundLevel={
          stage === "speaking" || stage === "openingSpeaking" ? 42 : soundLevel
        }
        isActive={
          stage === "recording" ||
          stage === "speaking" ||
          stage === "openingRecording" ||
          stage === "openingSpeaking"
        }
      />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
