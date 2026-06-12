"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { practiceService } from "@/app/services";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/hooks/useLanguage";

import SetupPhase from "@/app/components/common/PracticePage/SetupPhase";
import SetupPhaseSkeleton from "@/app/components/seletons/SetupPhaseSkeleton";
import InterviewPhase from "@/app/components/common/PracticePage/InterviewPhase";
import type {
  PracticePageProps,
  PracticeSessionResponse,
  PracticeStartOptions,
} from "@/app/types";

const DEFAULT_INDUSTRY = "Công nghệ thông tin";
const DEFAULT_LANGUAGE = "vi-VN";
const DEFAULT_VOICE = "vi-VN-HoaiMyNeural";

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PracticePage({ practiceId }: PracticePageProps) {
  const router = useRouter();
  const { refreshUser } = useAuthContext();
  const { language: uiLanguage, t } = useLanguage();
  const numberLocale = uiLanguage === "zh" ? "zh-CN" : uiLanguage === "en" ? "en-US" : "vi-VN";
  const [isLoading, setIsLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<"setup" | "interview">("setup");

  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY);
  const [jobDescription, setJobDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Middle");
  const [duration, setDuration] = useState(3);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [questionsList, setQuestionsList] = useState<string[]>([]);
  const [runId, setRunId] = useState("");

  const fetchSessionDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = (await practiceService.getById(practiceId)) as PracticeSessionResponse;
      if (data.success && data.session) {
        const session = data.session;
        setTitle(session.title || "");
        setIndustry(session.industry || DEFAULT_INDUSTRY);
        setJobDescription(session.jobDescription || "");
        setTopic(session.topic || "");
        setDifficulty(session.difficulty || "Middle");
        setDuration(session.questionCount || 3);
        setLanguage(session.language || DEFAULT_LANGUAGE);
        setVoiceId(session.voiceId || DEFAULT_VOICE);
      } else {
        toast.error(t("practiceSetup.loadSessionFailed"));
        router.push("/practice");
      }
    } catch (err) {
      console.error(err);
      toast.error(t("practiceSetup.serverConnectionError"));
      router.push("/practice");
    } finally {
      setIsLoading(false);
    }
  }, [practiceId, router, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSessionDetails();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSessionDetails]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch((err) => {
          console.error("Microphone access permission denied:", err);
          toast.error(t("practiceSetup.micPermissionDenied"));
        });
    }
  }, [t]);

  const handleStartInterview = async ({
    language: selectedLanguage,
    voiceId: selectedVoiceId,
    hasUploadedJdFile,
  }: PracticeStartOptions) => {
    if (!title.trim()) {
      toast.error(t("practiceSetup.titleRequired"));
      return;
    }

    if (!selectedVoiceId) {
      toast.error(t("practiceSetup.startVoiceRequired"));
      return;
    }

    try {
      setIsSavingSetup(true);
      const data = await practiceService.startInterview(practiceId, {
        title: title.trim(),
        industry,
        jobDescription: jobDescription.trim(),
        topic: topic.trim(),
        difficulty,
        duration,
        language: selectedLanguage,
        voiceId: selectedVoiceId,
        hasUploadedJdFile,
        idempotencyKey: createIdempotencyKey(),
      });

      if (!data.success || !data.runId || !data.questions?.length) {
        toast.error(data.message || t("practiceSetup.startInterviewFailed"));
        return;
      }

      setRunId(data.runId);
      setQuestionsList(data.questions.map((question) => question.text));
      setLanguage(selectedLanguage);
      setVoiceId(selectedVoiceId);
      await refreshUser();
      toast.success(
        t("practiceSetup.chargedAndStarted", {
          credits: (data.quote?.totalCredits || 0).toLocaleString(numberLocale),
        })
      );
      setActivePhase("interview");
    } catch (err: unknown) {
      console.error(err);
      toast.error(t("practiceSetup.chargeOrStartFailed"));
    } finally {
      setIsSavingSetup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen bg-background">
        <SetupPhaseSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background text-left relative overflow-hidden flex flex-col animate-in fade-in duration-300">
      {activePhase === "setup" ? (
        <SetupPhase
          router={router}
          practiceId={practiceId}
          title={title}
          setTitle={setTitle}
          industry={industry}
          setIndustry={setIndustry}
          jobDescription={jobDescription}
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
          isSavingSetup={isSavingSetup}
          handleStartInterview={handleStartInterview}
        />
      ) : (
        <InterviewPhase
          practiceId={practiceId}
          runId={runId}
          title={title}
          industry={industry}
          difficulty={difficulty}
          language={language}
          voiceId={voiceId}
          questionsList={questionsList}
          jobDescription={jobDescription}
          topic={topic}
        />
      )}
    </div>
  );
}
