"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { unlockInterviewAudio } from "@/app/lib/InterviewAudio";
import { practiceService } from "@/app/services";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/hooks/useLanguage";
import SilkBackground from "@/app/components/common/SilkBackground";

import SetupPhase from "@/app/components/common/PracticePage/SetupPhase";
import SetupPhaseSkeleton from "@/app/components/seletons/SetupPhaseSkeleton";
import InterviewPhase from "@/app/components/common/PracticePage/InterviewPhase";
import PreparationPhase from "@/app/components/common/PracticePage/PreparationPhase";
import type {
  GeneratedInterviewQuestion,
  InterviewQuestionAudio,
  PracticePageProps,
  PracticeSessionResponse,
  PracticeStartOptions,
  PracticeJobDescriptionSource,
} from "@/app/types";
import {
  DEFAULT_INTERVIEW_QUESTIONS,
  normalizeInterviewQuestionCount,
} from "@/app/lib/PracticeBilling";

const DEFAULT_INDUSTRY = "Công nghệ thông tin";
const DEFAULT_LANGUAGE = "vi-VN";
const DEFAULT_VOICE = "hn_female_ngochuyen_full_48k-fhg";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PracticePage({ practiceId }: PracticePageProps) {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuthContext();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<
    "setup" | "preparing" | "interview"
  >("setup");

  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY);
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionSource, setJobDescriptionSource] =
    useState<PracticeJobDescriptionSource>();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Middle");
  const [duration, setDuration] = useState(DEFAULT_INTERVIEW_QUESTIONS);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE);
  const [voiceName, setVoiceName] = useState("");
  const [autoTurnTaking, setAutoTurnTaking] = useState(false);
  const [textAnswerEnabled, setTextAnswerEnabled] = useState(false);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [recruitmentMode, setRecruitmentMode] = useState(false);
  const [recruitmentExpiresAt, setRecruitmentExpiresAt] = useState<
    string | undefined
  >();
  const [questionsList, setQuestionsList] = useState<
    GeneratedInterviewQuestion[]
  >([]);
  const [runId, setRunId] = useState("");
  const [initialOpeningAudio, setInitialOpeningAudio] =
    useState<InterviewQuestionAudio>();
  const [initialQuestionAudio, setInitialQuestionAudio] =
    useState<InterviewQuestionAudio>();
  const startAttemptRef = useRef<{
    fingerprint: string;
    idempotencyKey: string;
  } | null>(null);

  const fetchSessionDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = (await practiceService.getById(practiceId)) as PracticeSessionResponse;
      if (data.success && data.session) {
        const session = data.session;
        setTitle(session.title || "");
        setIndustry(session.industry || DEFAULT_INDUSTRY);
        setJobDescription(session.jobDescription || "");
        setJobDescriptionSource(session.jobDescriptionSource);
        setTopic(session.topic || "");
        setDifficulty(session.difficulty || "Middle");
        setDuration(normalizeInterviewQuestionCount(session.questionCount));
        setLanguage(DEFAULT_LANGUAGE);
        setVoiceId(session.voiceId || DEFAULT_VOICE);
        const isRecruitmentSession = session.source === "recruitment";
        setAutoTurnTaking(
          !isRecruitmentSession && session.autoTurnTaking === true
        );
        setTextAnswerEnabled(
          !isRecruitmentSession && session.textAnswerEnabled === true
        );
        setRecruitmentMode(isRecruitmentSession);
        setRecruitmentExpiresAt(session.expiresAt);
      } else {
        toast.error(t("practiceSetup.loadSessionFailed"));
        router.push("/practice");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      console.error(err);
      toast.error(t("practiceSetup.serverConnectionError"));
      router.push("/practice");
    } finally {
      setIsLoading(false);
    }
  }, [practiceId, router, t]);

  useEffect(() => {
    if (!authLoading && !user?.id) {
      router.replace("/login");
    }
  }, [authLoading, router, user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) return;

    const timeoutId = window.setTimeout(() => {
      void fetchSessionDetails();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading, fetchSessionDetails, user?.id]);

  const handleStartInterview = async ({
    language: selectedLanguage,
    voiceId: selectedVoiceId,
    voiceName: selectedVoiceName,
    openingPrompt: selectedOpeningPrompt,
    hasUploadedJdFile,
    autoTurnTaking: selectedAutoTurnTaking,
    textAnswerEnabled: selectedTextAnswerEnabled,
    jobDescriptionSource: selectedJobDescriptionSource,
  }: PracticeStartOptions) => {
    if (!title.trim()) {
      toast.error(t("practiceSetup.titleRequired"));
      return;
    }

    if (!selectedVoiceId) {
      toast.error(t("practiceSetup.startVoiceRequired"));
      return;
    }

    unlockInterviewAudio();
    try {
      setIsSavingSetup(true);
      setActivePhase("preparing");
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!selectedTextAnswerEnabled) {
          throw new Error("Microphone is not supported");
        }
      } else {
        try {
          const permissionStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          permissionStream.getTracks().forEach((track) => track.stop());
        } catch (microphoneError) {
          if (!selectedTextAnswerEnabled) throw microphoneError;
          console.warn(
            "Microphone unavailable; continuing with text-answer fallback:",
            microphoneError
          );
        }
      }
      const startPayload = {
        title: title.trim(),
        industry,
        jobDescription: jobDescription.trim(),
        topic: topic.trim(),
        difficulty,
        duration,
        language: selectedLanguage,
        voiceId: selectedVoiceId,
        openingPrompt: selectedOpeningPrompt,
        hasUploadedJdFile,
        autoTurnTaking: selectedAutoTurnTaking,
        textAnswerEnabled: selectedTextAnswerEnabled,
        jobDescriptionSource: selectedJobDescriptionSource,
      };
      const fingerprint = JSON.stringify(startPayload);
      if (startAttemptRef.current?.fingerprint !== fingerprint) {
        startAttemptRef.current = {
          fingerprint,
          idempotencyKey: createIdempotencyKey(),
        };
      }
      const data = await practiceService.startInterview(practiceId, {
        ...startPayload,
        idempotencyKey: startAttemptRef.current.idempotencyKey,
      });

      if (!data.success || !data.runId || !data.questions?.length) {
        startAttemptRef.current = null;
        toast.error(data.message || t("practiceSetup.startInterviewFailed"));
        setActivePhase("setup");
        return;
      }

      startAttemptRef.current = null;
      setRunId(data.runId);
      setQuestionsList(data.questions);
      setLanguage(data.language || selectedLanguage);
      setVoiceId(data.voiceId || selectedVoiceId);
      setVoiceName(selectedVoiceName);
      setInitialOpeningAudio(data.openingAudio);
      setInitialQuestionAudio(data.firstQuestionAudio);
      setActivePhase("interview");
      void refreshUser();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      console.error(err);
      if (
        axios.isAxiosError(err) &&
        err.response &&
        [400, 401, 402, 403, 404, 409, 410, 502].includes(
          err.response.status
        )
      ) {
        startAttemptRef.current = null;
      }
      if (
        err instanceof DOMException &&
        ["NotAllowedError", "SecurityError"].includes(err.name)
      ) {
        toast.error(t("practiceSetup.micPermissionDenied"));
      } else {
        toast.error(t("practiceSetup.chargeOrStartFailed"));
      }
      setActivePhase("setup");
    } finally {
      setIsSavingSetup(false);
    }
  };

  if (authLoading || !user?.id || isLoading) {
    return (
      <div className="flex h-screen w-screen bg-background relative overflow-hidden">
        <SilkBackground fadeBottom bottomColor="var(--background)" />
        <div className="relative z-10 w-full">
          <SetupPhaseSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background text-left relative overflow-hidden flex flex-col animate-in fade-in duration-300">
      <SilkBackground fadeBottom bottomColor="var(--background)" />
      <div className="relative z-10 w-full h-full flex flex-col">
        <AnimatePresence initial={false} mode="wait">
          {activePhase === "interview" ? (
            <motion.div
              key="interview"
              className="h-full w-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <InterviewPhase
                practiceId={practiceId}
                runId={runId}
                title={title}
                industry={industry}
                difficulty={difficulty}
                language={language}
                voiceId={voiceId}
                initialOpeningAudio={initialOpeningAudio}
                voiceName={voiceName}
                autoTurnTaking={autoTurnTaking}
                textAnswerEnabled={textAnswerEnabled}
                questionsList={questionsList}
                initialQuestionAudio={initialQuestionAudio}
                questionCount={duration}
                jobDescription={jobDescription}
                topic={topic}
              />
            </motion.div>
          ) : activePhase === "preparing" ? (
            <motion.div
              key="preparing"
              className="h-full w-full"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, filter: "blur(14px)", scale: 1.025 }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
            >
              <PreparationPhase />
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              className="h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(12px)", scale: 1.015 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
            >
              <SetupPhase
                router={router}
                practiceId={practiceId}
                title={title}
                setTitle={setTitle}
                industry={industry}
                setIndustry={setIndustry}
                jobDescription={jobDescription}
                jobDescriptionSource={jobDescriptionSource}
                setJobDescriptionSource={setJobDescriptionSource}
                setJobDescription={setJobDescription}
                topic={topic}
                setTopic={setTopic}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                duration={duration}
                setDuration={setDuration}
                language={language}
                setLanguage={setLanguage}
                voiceId={voiceId}
                setVoiceId={setVoiceId}
                autoTurnTaking={autoTurnTaking}
                setAutoTurnTaking={setAutoTurnTaking}
                textAnswerEnabled={textAnswerEnabled}
                setTextAnswerEnabled={setTextAnswerEnabled}
                isSavingSetup={isSavingSetup}
                recruitmentMode={recruitmentMode}
                recruitmentExpiresAt={recruitmentExpiresAt}
                handleStartInterview={handleStartInterview}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
