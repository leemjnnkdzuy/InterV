"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { BriefcaseBusiness, Languages, LockKeyhole, Volume2, VolumeX } from "lucide-react";
import { aiService, practiceService } from "@/app/services";
import { Spinner } from "@/app/components/ui/spinner";
import { INDUSTRIES } from "@/app/contants";
import { getDifficultyLevels, getErrorMessage } from "@/app/lib/Utils";
import { calculatePracticeQuote } from "@/app/lib/PracticeBilling";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Card } from "@/app/components/ui/card";
import { Switch } from "@/app/components/ui/switch";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateIndustry } from "@/app/lib/Localization";
import {
  playInterviewAudio,
  stopInterviewAudio,
} from "@/app/lib/InterviewAudio";
import type { InterviewVoice, SetupPhaseProps } from "@/app/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  AltArrowLeft,
  Pen2,
  UploadMinimalistic,
  CheckCircle,
  PlayCircle,
  TrashBinMinimalistic,
  DocumentText,
  WalletMoney,
} from "@solar-icons/react";

const LANGUAGE_OPTIONS = [
  { id: "vi-VN", labelKey: "practiceSetup.languageVi", sampleKey: "practiceSetup.sampleVi" },
];

const DEFAULT_VOICE_BY_LANGUAGE: Record<string, string> = {
  "vi-VN": "hn_female_ngochuyen_full_48k-fhg",
};

type VoicePreviewAudio = {
  audioBase64: string;
  contentType: string;
};

export default function SetupPhase({
  router,
  practiceId,
  title,
  setTitle,
  industry,
  setIndustry,
  jobDescription,
  setJobDescription,
  topic,
  setTopic,
  difficulty,
  setDifficulty,
  duration,
  setDuration,
  language,
  setLanguage,
  voiceId,
  setVoiceId,
  autoTurnTaking,
  setAutoTurnTaking,
  textAnswerEnabled,
  setTextAnswerEnabled,
  isSavingSetup,
  recruitmentMode = false,
  recruitmentExpiresAt,
  handleStartInterview,
}: SetupPhaseProps) {
  const { user } = useAuthContext();
  const { language: uiLanguage, t } = useLanguage();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [jdTab, setJdTab] = useState<"upload" | "paste">(
    recruitmentMode ? "paste" : "upload"
  );
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [isUpdatingIndustry, setIsUpdatingIndustry] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<{ name: string; size: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [voices, setVoices] = useState<InterviewVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false);
  const [preparedVoicePreviewKey, setPreparedVoicePreviewKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedVoiceLanguageRef = useRef("");
  const voicePreviewGenerationRef = useRef(0);
  const voicePreviewCacheRef = useRef(new Map<string, VoicePreviewAudio>());
  const voicePreviewRequestRef = useRef(
    new Map<string, Promise<VoicePreviewAudio>>()
  );

  const quote = useMemo(
    () =>
      recruitmentMode
        ? {
            totalCredits: 0,
            vndEquivalent: 0,
            balanceCredits: user?.credits || 0,
            remainingCredits: user?.credits || 0,
            canAfford: true,
            breakdown: [
              {
                key: "recruitment" as const,
                label: "Nhà tuyển dụng tài trợ",
                credits: 0,
              },
            ],
          }
        : calculatePracticeQuote({
            duration,
            hasUploadedJdFile: Boolean(uploadFile),
            balanceCredits: user?.credits || 0,
          }),
    [duration, recruitmentMode, uploadFile, user?.credits]
  );

  const languageOptions = LANGUAGE_OPTIONS.map((item) => ({
    ...item,
    label: t(item.labelKey),
    sample: t(item.sampleKey),
  }));
  const selectedLanguage = languageOptions.find((item) => item.id === language) || languageOptions[0];
  const selectedLanguageSample = selectedLanguage.sample;
  const selectedVoice = voices.find((voice) => voice.id === voiceId);
  const numberLocale = uiLanguage === "zh" ? "zh-CN" : uiLanguage === "en" ? "en-US" : "vi-VN";
  const voicePreviewKey = `${language}:${voiceId}:${selectedLanguageSample}`;
  const isCurrentVoicePreviewReady =
    Boolean(voiceId) &&
    preparedVoicePreviewKey === voicePreviewKey;

  const getVoiceGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const normalizedGender = gender.toLowerCase();
    if (normalizedGender === "female") return t("practiceSetup.voiceGenderFemale");
    if (normalizedGender === "male") return t("practiceSetup.voiceGenderMale");
    if (normalizedGender === "neutral") return t("practiceSetup.voiceGenderNeutral");
    return gender;
  };

  const getQuoteBreakdownLabel = (item: { key?: string; label: string }) => {
    if (item.key === "aiQuestions") {
      return t("practiceSetup.quoteAiQuestions", { count: duration });
    }
    if (item.key === "jdUpload") {
      return t("practiceSetup.quoteJdUpload");
    }
    return item.label;
  };

  useEffect(() => {
    if (!user?.id) return;
    if (loadedVoiceLanguageRef.current === language) return;
    let cancelled = false;

    const fetchVoices = async () => {
      try {
        setIsLoadingVoices(true);
        const data = await aiService.getVoices(language);
        if (cancelled) return;
        const nextVoices = data.voices || [];
        loadedVoiceLanguageRef.current = language;
        setVoices(nextVoices);

        if (!nextVoices.some((voice) => voice.id === voiceId)) {
          setVoiceId(nextVoices[0]?.id || DEFAULT_VOICE_BY_LANGUAGE[language] || "");
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return;
        }
        console.error(error);
        if (!cancelled) {
          setVoices([]);
          setVoiceId(DEFAULT_VOICE_BY_LANGUAGE[language] || "");
          toast.error(t("practiceSetup.voicesLoadFailed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false);
        }
      }
    };

    void fetchVoices();

    return () => {
      cancelled = true;
    };
  }, [language, setVoiceId, t, user?.id, voiceId]);

  useEffect(() => {
    if (!industry) return;
    const difficulties = getDifficultyLevels(industry);
    if (!difficulties.some((item) => item.id === difficulty)) {
      setDifficulty(difficulties[0]?.id || "Junior");
    }
  }, [difficulty, industry, setDifficulty]);

  const stopVoicePreview = useCallback(() => {
    voicePreviewGenerationRef.current += 1;
    stopInterviewAudio();
    setIsPreviewingVoice(false);
    setIsVoicePreviewPlaying(false);
  }, []);

  useEffect(() => () => stopInterviewAudio(), []);

  useEffect(() => {
    if (isLoadingVoices || !voiceId || !selectedVoice) return;
    let cancelled = false;
    const key = `${language}:${voiceId}:${selectedLanguageSample}`;
    const cached = voicePreviewCacheRef.current.get(key);

    if (cached) {
      setPreparedVoicePreviewKey(key);
      setIsPreviewingVoice(false);
      return;
    }

    queueMicrotask(() => {
      if (!cancelled) setIsPreviewingVoice(true);
    });

    const existingRequest = voicePreviewRequestRef.current.get(key);
    const request =
      existingRequest ??
      aiService
        .previewVoice({
          text: selectedLanguageSample,
          language,
          voiceId,
        })
        .then((data) => {
          if (!data.audioBase64) {
            throw new Error(data.message || t("practiceSetup.ttsNoAudio"));
          }
          const audio = {
            audioBase64: data.audioBase64,
            contentType: data.contentType,
          };
          voicePreviewCacheRef.current.set(key, audio);
          return audio;
        })
        .finally(() => {
          voicePreviewRequestRef.current.delete(key);
        });

    if (!existingRequest) {
      voicePreviewRequestRef.current.set(key, request);
    }

    void request
      .then(() => {
        if (cancelled) return;
        setPreparedVoicePreviewKey(key);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
      })
      .finally(() => {
        if (cancelled) return;
        setIsPreviewingVoice(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isLoadingVoices,
    language,
    selectedLanguageSample,
    selectedVoice,
    t,
    voiceId,
  ]);

  const handleSaveTitle = async () => {
    if (!title.trim()) {
      toast.error(t("practiceSetup.titleRequired"));
      return;
    }

    try {
      setIsUpdatingTitle(true);
      const data = await practiceService.update(practiceId, {
        title: title.trim(),
      });
      if (data.success) {
        setIsEditingTitle(false);
      } else {
        toast.error(data.message || t("practiceSetup.titleUpdateFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("practiceSetup.serverConnectionError"));
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleIndustryChange = async (newIndustry: string) => {
    try {
      setIsUpdatingIndustry(true);
      const data = await practiceService.update(practiceId, {
        industry: newIndustry,
      });
      if (data.success) {
        setIndustry(newIndustry);
      } else {
        toast.error(data.message || t("practiceSetup.industryUpdateFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("practiceSetup.serverConnectionError"));
    } finally {
      setIsUpdatingIndustry(false);
    }
  };

  const processSelectedFile = async (file: File) => {
    const validExtensions = ["pdf", "docx", "txt"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (!fileExt || !validExtensions.includes(fileExt)) {
      toast.error(t("practiceSetup.invalidJdFile"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("practiceSetup.jdFileTooLarge"));
      return;
    }

    setUploadFile({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(t("practiceSetup.uploadingJd"));

    try {
      const data = await aiService.extractJd(file, (progress) => {
        setUploadProgress(progress);
        if (progress >= 95) {
          setUploadStatus(t("practiceSetup.extractingJd"));
        }
      });

      if (!data.success || !data.markdown) {
        throw new Error(data.message || t("practiceSetup.extractJdFailed"));
      }

      setUploadProgress(100);
      setUploadStatus(t("practiceSetup.extractJdDone"));
      setJobDescription(data.markdown);
      toast.success(t("practiceSetup.extractJdSuccess"));
    } catch (error) {
      console.error(error);
      setUploadFile(null);
      setUploadProgress(0);
      toast.error(t("practiceSetup.extractJdManual"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      void processSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processSelectedFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    setJobDescription("");
    setUploadProgress(0);
  };

  const handleLanguageChange = (nextLanguage: string) => {
    stopVoicePreview();
    setLanguage(nextLanguage);
  };

  const handleVoiceChange = (nextVoiceId: string) => {
    stopVoicePreview();
    setVoiceId(nextVoiceId);
  };

  const handlePreviewVoice = async () => {
    if (isVoicePreviewPlaying) {
      stopVoicePreview();
      return;
    }

    const previewAudio = voicePreviewCacheRef.current.get(voicePreviewKey);
    if (!previewAudio) {
      toast.error(t("practiceSetup.preparingVoice"));
      return;
    }

    const generation = ++voicePreviewGenerationRef.current;
    try {
      setIsVoicePreviewPlaying(true);
      await playInterviewAudio(previewAudio.audioBase64, previewAudio.contentType);
      if (generation !== voicePreviewGenerationRef.current) return;
      setIsVoicePreviewPlaying(false);
    } catch (error) {
      if (generation !== voicePreviewGenerationRef.current) return;
      console.error(error);
      setIsVoicePreviewPlaying(false);
      toast.error(getErrorMessage(error, t("practiceSetup.ttsPreviewFailed")));
    }
  };

  const handleStartClick = () => {
    if (!quote.canAfford) {
      router.push("/credit");
      return;
    }

    handleStartInterview({
      language,
      voiceId,
      voiceName: selectedVoice?.name || "",
      hasUploadedJdFile: recruitmentMode ? false : Boolean(uploadFile),
      autoTurnTaking,
      textAnswerEnabled,
    });
  };

  const startDisabled =
    isSavingSetup ||
    isUploading ||
    isLoadingVoices ||
    !selectedVoice ||
    !voiceId ||
    !quote.canAfford;

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
      <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between shrink-0 select-none">
        <Button
          variant="outline"
          onClick={() => router.push("/practice")}
          className="rounded-full flex items-center gap-2 border-border/40 hover:bg-muted/50 cursor-pointer h-10 px-4 text-xs font-semibold"
        >
          <AltArrowLeft className="w-4 h-4" />
          <span>{t("practiceSetup.back")}</span>
        </Button>
        <h1 className="font-logo text-xl font-bold tracking-tight text-foreground">
          InterV<span className="text-[var(--chart-1)]">.</span>
        </h1>
      </div>

      <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto no-scrollbar gap-6">
        {recruitmentMode && (
          <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-4 py-3 text-cyan-100 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
                <BriefcaseBusiness className="size-4.5" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-extrabold">
                  Phỏng vấn do nhà tuyển dụng giao
                  <LockKeyhole className="size-3.5" />
                </p>
                <p className="mt-0.5 text-xs text-cyan-100/70">
                  Cấu hình đã được khóa và ứng viên không bị trừ Credits.
                </p>
              </div>
            </div>
            {recruitmentExpiresAt && (
              <span className="text-xs font-semibold text-cyan-100/80">
                Hạn{" "}
                {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(recruitmentExpiresAt))}
              </span>
            )}
          </div>
        )}
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          <div className="lg:col-span-5 flex flex-col h-full min-h-0">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[28px] overflow-hidden shadow-sm flex flex-col justify-between p-6">
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-border/10 shrink-0">
                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.titleLabel")}</label>
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleSaveTitle();
                          }}
                          className="bg-card/40 border border-primary/50 text-foreground text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-full h-[42px]"
                          autoFocus
                          disabled={isUpdatingTitle}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void handleSaveTitle()}
                          disabled={isUpdatingTitle}
                          className="h-[42px] w-[42px] shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 cursor-pointer"
                        >
                          {isUpdatingTitle ? <Spinner className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full border border-border/10 bg-card/5 px-4 py-2.5 rounded-2xl h-[42px]">
                        <h2 className="text-xs font-bold text-foreground tracking-tight truncate flex-1">
                          {title || t("practiceSetup.unnamedTitle")}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setIsEditingTitle(true)}
                          disabled={recruitmentMode}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 cursor-pointer shrink-0 ml-2"
                          title={t("practiceSetup.renameTitle")}
                        >
                          <Pen2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.industryLabel")}</label>
                    <Select value={industry} onValueChange={handleIndustryChange} disabled={isUpdatingIndustry || recruitmentMode}>
                      <SelectTrigger className="rounded-2xl w-full border border-border/20 bg-card/20 hover:bg-card/45 text-xs font-bold text-foreground cursor-pointer h-[42px] px-4">
                        <div className="flex items-center gap-2">
                          {isUpdatingIndustry && <Spinner className="w-3.5 h-3.5 text-primary" />}
                          <SelectValue placeholder={t("practiceSetup.industryPlaceholder")} />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border/10 rounded-2xl shadow-lg">
                        {INDUSTRIES.map((item) => (
                          <SelectItem key={item} value={item} className="cursor-pointer rounded-xl text-xs">
                            {translateIndustry(t, item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-border/10 pb-3 shrink-0">
                  <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">{t("practiceSetup.jobDescription")}</h3>
                  <div className="flex bg-muted/40 p-0.5 rounded-xl border border-border/5">
                    <button
                      type="button"
                      onClick={() => setJdTab("upload")}
                      disabled={recruitmentMode}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-tight cursor-pointer ${
                        jdTab === "upload" ? "bg-background text-primary shadow" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("practiceSetup.uploadFile")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setJdTab("paste")}
                      disabled={recruitmentMode}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold tracking-tight cursor-pointer ${
                        jdTab === "paste" ? "bg-background text-primary shadow" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("practiceSetup.pasteText")}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 px-1.5 py-2 flex flex-col">
                  {jdTab === "upload" ? (
                    <div className="space-y-4 flex-1 flex flex-col">
                      {!uploadFile ? (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer flex-1 min-h-[220px] group ${
                            isDragging
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                              : "border-border/20 hover:border-primary/50 bg-card/10 hover:bg-card/25"
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <div className={`p-3.5 rounded-2xl bg-muted/30 text-muted-foreground group-hover:text-primary mb-2.5 ${isDragging ? "text-primary" : ""}`}>
                            <UploadMinimalistic className="w-7 h-7" />
                          </div>
                          <span className="text-xs font-bold text-foreground">{t("practiceSetup.dragUpload")}</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">{t("practiceSetup.fileLimit")}</span>
                        </div>
                      ) : (
                        <div className="space-y-3 flex-1 flex flex-col">
                          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-primary text-background font-black text-xs shrink-0 flex items-center justify-center">
                                <DocumentText className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-foreground truncate">{uploadFile.name}</h4>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{uploadFile.size}</p>
                              </div>
                            </div>
                            {!isUploading && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRemoveFile}
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl cursor-pointer"
                              >
                                <TrashBinMinimalistic className="w-4.5 h-4.5" />
                              </Button>
                            )}
                          </div>

                          {isUploading && (
                            <div className="space-y-2 border border-border/10 p-3 rounded-2xl bg-card/20">
                              <div className="flex items-center justify-between text-[9px] font-bold">
                                <span className="text-primary">{uploadStatus}</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-muted/30 rounded-full h-1 overflow-hidden">
                                <div className="bg-primary h-1 rounded-full" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          )}

                          {!isUploading && jobDescription && (
                            <div className="space-y-1.5 flex-1 flex flex-col min-h-[140px]">
                              <label className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.extractedJd")}</label>
                              <Textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                disabled={recruitmentMode}
                                className="rounded-2xl flex-1 text-left resize-none focus:ring-primary border-border/10 bg-card/5 text-xs leading-relaxed"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-[220px]">
                      <Textarea
                        placeholder={t("practiceSetup.jdPlaceholder")}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        disabled={recruitmentMode}
                        className="w-full flex-1 rounded-2xl text-left resize-none focus:ring-primary border-border/10 bg-card/5 text-xs leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-border/10 shrink-0">
                <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  {t("practiceSetup.topicLabel")}
                </label>
                <Textarea
                  placeholder={t("practiceSetup.topicPlaceholder")}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={recruitmentMode}
                  className="rounded-2xl min-h-[50px] text-left resize-none focus:ring-primary border-border/10 bg-card/5 text-xs"
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 flex flex-col h-full min-h-0">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[28px] p-6 shadow-sm flex flex-col gap-5 justify-between overflow-hidden">
              <div className="border-b border-border/10 pb-3 shrink-0">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">{t("practiceSetup.interviewSettings")}</h3>
              </div>

              <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto no-scrollbar p-1.5">
                <div className="space-y-2">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.difficultyLabel")}</label>
                  <div className="flex flex-col gap-1.5">
                    {getDifficultyLevels(industry).map((levelObj) => {
                      const isSelected = difficulty === levelObj.id;
                      return (
                        <button
                          type="button"
                          key={levelObj.id}
                          onClick={() => setDifficulty(levelObj.id)}
                          disabled={recruitmentMode}
                          className={`w-full p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border/10 bg-card/5 hover:bg-card/15 text-muted-foreground"
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-extrabold">{levelObj.name}</span>
                            <span className="block text-[8px] font-medium opacity-80 mt-0.5">{levelObj.description}</span>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/10">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.questionCountLabel")}</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[5, 7, 12, 16, 20, 25].map((num) => {
                      const isSelected = duration === num;
                      return (
                        <button
                          type="button"
                          key={num}
                          onClick={() => setDuration(num)}
                          disabled={recruitmentMode}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border/10 bg-card/5 hover:bg-card/15 text-muted-foreground"
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-extrabold">{t("practiceSetup.questionCount", { count: num })}</span>
                            <span className="block text-[8px] font-medium opacity-80 mt-0.5">{num * 10} Credits</span>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/10">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {t("practiceSetup.interactionModes")}
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/10 bg-card/10 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-foreground">
                          {t("practiceSetup.realInterviewMode")}
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                          {t("practiceSetup.realInterviewModeDescription")}
                        </p>
                      </div>
                      <Switch
                        checked={autoTurnTaking}
                        onCheckedChange={setAutoTurnTaking}
                        disabled={recruitmentMode}
                        aria-label={t("practiceSetup.realInterviewMode")}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/10 bg-card/10 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-foreground">
                          {t("practiceSetup.textAnswerMode")}
                        </p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                          {t("practiceSetup.textAnswerModeDescription")}
                        </p>
                      </div>
                      <Switch
                        checked={textAnswerEnabled}
                        onCheckedChange={setTextAnswerEnabled}
                        disabled={recruitmentMode}
                        aria-label={t("practiceSetup.textAnswerMode")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-4">
            <Card className="border border-border/10 bg-card/15 backdrop-blur-md rounded-[28px] p-6 shadow-sm flex flex-col gap-4 overflow-hidden">
              <div className="border-b border-border/10 pb-3 shrink-0">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-primary" />
                  {t("practiceSetup.languageVoice")}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.interviewLanguage")}</label>
                  <Select value={language} onValueChange={handleLanguageChange} disabled={recruitmentMode}>
                    <SelectTrigger className="min-w-0 overflow-hidden rounded-2xl w-full border border-border/20 bg-card/20 text-xs font-bold text-foreground cursor-pointer h-[42px] px-4 [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:max-w-full [&_[data-slot=select-value]]:truncate">
                      <SelectValue
                        placeholder={t("practiceSetup.languagePlaceholder")}
                        className="block min-w-0 max-w-full truncate"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border/10 rounded-2xl shadow-lg">
                      {languageOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id} className="cursor-pointer rounded-xl text-xs">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceSetup.interviewVoice")}</label>
                  <div className="flex min-w-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <Select value={voiceId} onValueChange={handleVoiceChange} disabled={isLoadingVoices || recruitmentMode}>
                        <SelectTrigger className="min-w-0 overflow-hidden rounded-2xl w-full border border-border/20 bg-card/20 text-xs font-bold text-foreground cursor-pointer h-[42px] px-4 [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:max-w-full [&_[data-slot=select-value]]:truncate">
                          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                          {isLoadingVoices && <Spinner className="w-3.5 h-3.5 text-primary" />}
                            <SelectValue
                              placeholder={t("practiceSetup.voicePlaceholder")}
                              className="block min-w-0 max-w-full truncate"
                            />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-card border border-border/10 rounded-2xl shadow-lg">
                          {voices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id} className="cursor-pointer rounded-xl text-xs">
                              {voice.name} {voice.gender ? `(${getVoiceGenderLabel(voice.gender)})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handlePreviewVoice()}
                      disabled={isLoadingVoices || !isCurrentVoicePreviewReady}
                      className="!h-9 !w-9 !min-h-0 shrink-0 rounded-full p-0 cursor-pointer"
                      title={
                        isVoicePreviewPlaying
                          ? t("practiceSetup.stopPreviewVoice")
                          : isCurrentVoicePreviewReady
                          ? t("practiceSetup.previewVoice")
                          : t("practiceSetup.preparingVoice")
                      }
                    >
                      {(isPreviewingVoice || isLoadingVoices) && !isVoicePreviewPlaying ? (
                        <Spinner className="w-4 h-4" />
                      ) : isVoicePreviewPlaying ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[28px] p-6 shadow-sm flex flex-col gap-4 overflow-hidden">
              <div className="border-b border-border/10 pb-3 shrink-0">
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <WalletMoney className="w-4 h-4 text-primary" />
                  {t("practiceSetup.costBeforePractice")}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border/10 bg-card/10 p-3">
                    <p className="text-[9px] uppercase font-extrabold text-muted-foreground">{t("practiceSetup.currentBalance")}</p>
                    <p className="mt-1 text-lg font-black text-foreground">{quote.balanceCredits.toLocaleString(numberLocale)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/10 bg-card/10 p-3">
                    <p className="text-[9px] uppercase font-extrabold text-muted-foreground">{t("practiceSetup.cost")}</p>
                    <p className="mt-1 text-lg font-black text-primary">{quote.totalCredits.toLocaleString(numberLocale)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/10 bg-card/10 p-3 space-y-2">
                  {quote.breakdown.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{getQuoteBreakdownLabel(item)}</span>
                      <span className="font-bold text-foreground">{item.credits.toLocaleString(numberLocale)} Credits</span>
                    </div>
                  ))}
                  <div className="border-t border-border/10 pt-2 flex items-center justify-between">
                    <span className="font-bold text-foreground">{t("practiceSetup.equivalent")}</span>
                    <span className="font-black text-foreground">{quote.vndEquivalent.toLocaleString(numberLocale)} VND</span>
                  </div>
                </div>

                <div className={`rounded-2xl border p-3 ${
                  quote.canAfford
                    ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-500"
                    : "border-red-500/15 bg-red-500/5 text-red-500"
                }`}>
                  {quote.canAfford
                    ? t("practiceSetup.balanceAfter", { credits: quote.remainingCredits.toLocaleString(numberLocale) })
                    : t("practiceSetup.creditsNeeded", { credits: Math.abs(quote.remainingCredits).toLocaleString(numberLocale) })}
                </div>
              </div>
            </Card>

            <div className="shrink-0 flex gap-2">
              {!quote.canAfford && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/credit")}
                  className="rounded-2xl py-4 px-4 font-bold text-xs cursor-pointer"
                >
                  {t("practiceSetup.topUpCredits")}
                </Button>
              )}
              <button
                onClick={handleStartClick}
                disabled={startDisabled}
                className="flex-1 rounded-2xl py-4 font-black text-xs tracking-wider shadow-md bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer flex items-center justify-center gap-2 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSetup ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    {t("practiceSetup.savingStart")}
                  </>
                ) : (
                  <>
                    <PlayCircle weight="BoldDuotone" className="w-4.5 h-4.5" />
                    {recruitmentMode
                      ? "Bắt đầu phỏng vấn tuyển dụng"
                      : quote.canAfford
                      ? t("practiceSetup.startWithCredits", { credits: quote.totalCredits.toLocaleString(numberLocale) })
                      : t("practiceSetup.insufficientCredits")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
