"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bag as BriefcaseBusiness,
  CalendarDate as CalendarDays,
  CheckCircle as Check,
  FileText,
  FileDownload as FileUp,
  Refresh as LoaderCircle,
  Letter as Mail,
  AddCircle as Plus,
  Magnifier as Search,
  TuningSquare as Settings2,
  TrashBin2 as Trash2,
  UsersGroupRounded as Users,
  VolumeLoud as Volume2,
} from "@solar-icons/react";
import { VolumeX, Plus as PlusIcon, Minus as MinusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { DateTimePickerInput } from "@/app/components/ui/date-picker";
import { Textarea } from "@/app/components/ui/textarea";
import { aiService } from "@/app/services/AiService";
import { playInterviewAudio, stopInterviewAudio } from "@/app/lib/InterviewAudio";
import { getErrorMessage } from "@/app/lib/Utils";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { QUESTION_CREDIT_COST } from "@/app/lib/PracticeBilling";
import {
  DashboardPageHeader,
  DashboardSelect,
} from "@/app/dashboard/components/DashboardPrimitives";
import {
  DashboardApiError,
  dashboardRequest,
} from "@/app/dashboard/lib/client";
import type { InterviewVoice } from "@/app/types";

interface CandidateSuggestion {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface CandidateSearchResponse {
  success: true;
  candidates: CandidateSuggestion[];
}

interface VoiceResponse {
  success: true;
  voices: InterviewVoice[];
}

interface CreateResponse {
  success: true;
  campaignId: string;
  invitationCount: number;
  emailDispatch: string;
  message: string;
}

const LANGUAGE_OPTIONS = [
  {
    id: "vi-VN",
    label: "Tiếng Việt",
    sample: "Xin chào, tôi sẽ đồng hành cùng bạn trong buổi phỏng vấn hôm nay.",
  },
  {
    id: "en-US",
    label: "English",
    sample: "Hello, I will guide your interview practice today.",
  },
  {
    id: "zh-CN",
    label: "中文",
    sample: "你好，今天我将陪你完成这场面试练习。",
  },
] as const;

const DEFAULT_VOICE_BY_LANGUAGE: Record<string, string> = {
  "vi-VN": "hn_female_ngochuyen_full_48k-fhg",
  "en-US": "en-US-JennyNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
};

type VoicePreviewAudio = {
  audioBase64: string;
  contentType: string;
};

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const defaultStart = toLocalDateTimeInput(new Date());
const defaultEnd = toLocalDateTimeInput(
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
);

export default function CreateRecruitmentInterviewPage() {
  const router = useRouter();
  const jdFileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [minimumEnd] = useState(() =>
    toLocalDateTimeInput(new Date(Date.now() + 5 * 60 * 1000))
  );
  const [extractingJd, setExtractingJd] = useState(false);
  const [jdProgress, setJdProgress] = useState(0);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [suggestions, setSuggestions] = useState<CandidateSuggestion[]>([]);
  const [candidates, setCandidates] = useState<CandidateSuggestion[]>([]);
  const [voices, setVoices] = useState<InterviewVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false);
  const [preparedVoicePreviewKey, setPreparedVoicePreviewKey] = useState("");

  const voicePreviewGenerationRef = useRef(0);
  const voicePreviewCacheRef = useRef(new Map<string, VoicePreviewAudio>());
  const voicePreviewRequestRef = useRef(
    new Map<string, Promise<VoicePreviewAudio>>()
  );

  const [form, setForm] = useState({
    title: "",
    jobTitle: "",
    department: "",
    industry: "Công nghệ thông tin",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    location: "",
    jobDescription: "",
    topic: "",
    language: "vi-VN",
    voiceId: "hn_female_ngochuyen_full_48k-fhg",
    difficulty: "Middle",
    questionCount: 5,
    maxAttempts: 1,
    startsAt: defaultStart,
    endsAt: defaultEnd,
    invitationMessage: "",
  });

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const selectedLanguageOption = useMemo(
    () =>
      LANGUAGE_OPTIONS.find((item) => item.id === form.language) ||
      LANGUAGE_OPTIONS[0],
    [form.language]
  );

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.id === form.voiceId),
    [form.voiceId, voices]
  );

  const getVoiceGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const normalized = gender.toLowerCase();
    if (normalized === "female") return "Nữ";
    if (normalized === "male") return "Nam";
    if (normalized === "neutral") return "Trung tính";
    return gender;
  };

  const stopVoicePreview = useCallback(() => {
    voicePreviewGenerationRef.current += 1;
    stopInterviewAudio();
    setIsPreviewingVoice(false);
    setIsVoicePreviewPlaying(false);
  }, []);

  useEffect(() => () => stopInterviewAudio(), []);

  const handleLanguageChange = (nextLanguage: string) => {
    stopVoicePreview();
    update("language", nextLanguage);
  };

  const handleVoiceChange = (nextVoiceId: string) => {
    stopVoicePreview();
    update("voiceId", nextVoiceId);
  };

  useEffect(() => {
    let cancelled = false;
    const loadVoices = async () => {
      stopVoicePreview();
      setLoadingVoices(true);
      try {
        const response = await aiService.getVoices(form.language);
        if (cancelled) return;
        const nextVoices = response.voices || [];
        setVoices(nextVoices);
        if (
          nextVoices.length > 0 &&
          !nextVoices.some((voice) => voice.id === form.voiceId)
        ) {
          const defaultVoice =
            DEFAULT_VOICE_BY_LANGUAGE[form.language] || nextVoices[0].id;
          const exists = nextVoices.some((v) => v.id === defaultVoice);
          update("voiceId", exists ? defaultVoice : nextVoices[0].id);
        }
      } catch {
        if (!cancelled) setVoices([]);
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    };
    void loadVoices();
    return () => {
      cancelled = true;
    };
  }, [form.language, stopVoicePreview]);

  useEffect(() => {
    if (loadingVoices || !form.voiceId || !selectedVoice) return;
    let cancelled = false;
    const key = `${form.language}:${form.voiceId}:${selectedLanguageOption.sample}`;
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
          text: selectedLanguageOption.sample,
          language: form.language,
          voiceId: form.voiceId,
        })
        .then((data) => {
          if (!data.audioBase64) {
            throw new Error(data.message || "Chưa tạo được audio nghe thử");
          }
          const audio = {
            audioBase64: data.audioBase64,
            contentType: data.contentType || "audio/wav",
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
        console.error("Voice preview error:", error);
      })
      .finally(() => {
        if (cancelled) return;
        setIsPreviewingVoice(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    form.language,
    form.voiceId,
    loadingVoices,
    selectedLanguageOption.sample,
    selectedVoice,
  ]);

  const handlePreviewVoice = async () => {
    if (isVoicePreviewPlaying) {
      stopVoicePreview();
      return;
    }

    const voicePreviewKey = `${form.language}:${form.voiceId}:${selectedLanguageOption.sample}`;
    let previewAudio = voicePreviewCacheRef.current.get(voicePreviewKey);

    if (!previewAudio) {
      try {
        setIsPreviewingVoice(true);
        const data = await aiService.previewVoice({
          text: selectedLanguageOption.sample,
          language: form.language,
          voiceId: form.voiceId,
        });
        if (!data.audioBase64) {
          throw new Error(data.message || "Không có dữ liệu âm thanh");
        }
        previewAudio = {
          audioBase64: data.audioBase64,
          contentType: data.contentType || "audio/wav",
        };
        voicePreviewCacheRef.current.set(voicePreviewKey, previewAudio);
        setPreparedVoicePreviewKey(voicePreviewKey);
      } catch (err) {
        toast.error(getErrorMessage(err, "Không thể nghe thử giọng đọc"));
        return;
      } finally {
        setIsPreviewingVoice(false);
      }
    }

    const generation = ++voicePreviewGenerationRef.current;
    try {
      setIsVoicePreviewPlaying(true);
      await playInterviewAudio(
        previewAudio.audioBase64,
        previewAudio.contentType
      );
      if (generation !== voicePreviewGenerationRef.current) return;
      setIsVoicePreviewPlaying(false);
    } catch (error) {
      if (generation !== voicePreviewGenerationRef.current) return;
      console.error(error);
      setIsVoicePreviewPlaying(false);
      toast.error(getErrorMessage(error, "Không thể phát âm thanh nghe thử"));
    }
  };

  useEffect(() => {
    const query = candidateQuery.trim();
    if (query.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchingCandidates(true);
      try {
        const response = await dashboardRequest<CandidateSearchResponse>(
          `/api/recruiter/candidate-search?q=${encodeURIComponent(query)}`
        );
        if (!cancelled) {
          const selectedIds = new Set(candidates.map((candidate) => candidate.id));
          setSuggestions(
            response.candidates.filter(
              (candidate) => !selectedIds.has(candidate.id)
            )
          );
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearchingCandidates(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [candidateQuery, candidates]);

  const { user } = useAuthContext();
  const costPerCandidate = form.questionCount * QUESTION_CREDIT_COST;
  const totalCost = candidates.length * costPerCandidate;
  const userCredits = user?.credits || 0;
  const remainingCredits = userCredits - totalCost;
  const hasSufficientCredits = candidates.length === 0 || userCredits >= totalCost;

  const estimatedMinutes = Math.max(8, form.questionCount * 2);
  const canSubmit = useMemo(
    () =>
      form.title.trim().length >= 3 &&
      form.jobTitle.trim().length >= 2 &&
      form.industry.trim().length >= 2 &&
      form.jobDescription.trim().length >= 20 &&
      Boolean(form.endsAt) &&
      candidates.length > 0 &&
      hasSufficientCredits &&
      !submitting,
    [candidates.length, form, hasSufficientCredits, submitting]
  );

  const addCandidate = (candidate: CandidateSuggestion) => {
    setCandidates((current) =>
      current.some((item) => item.id === candidate.id)
        ? current
        : [...current, candidate]
    );
    setCandidateQuery("");
    setSuggestions([]);
  };

  const handleJdFile = async (file: File | undefined) => {
    if (!file) return;
    setExtractingJd(true);
    setJdProgress(0);
    try {
      const result = await aiService.extractJd(file, setJdProgress);
      if (!result.success || !result.markdown) {
        throw new Error(result.message || "Không thể đọc JD");
      }
      update("jobDescription", result.markdown);
      toast.success("Đã trích xuất nội dung JD");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể trích xuất JD"
      );
    } finally {
      setExtractingJd(false);
      setJdProgress(0);
      if (jdFileRef.current) jdFileRef.current.value = "";
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasSufficientCredits) {
      toast.error(
        `Bạn cần ${totalCost.toLocaleString("vi-VN")} Credits để tạo phỏng vấn cho ${candidates.length} ứng viên. Vui lòng nạp thêm Credits.`
      );
      return;
    }
    if (!canSubmit) {
      toast.error("Vui lòng hoàn thành thông tin bắt buộc và chọn ứng viên");
      return;
    }
    setSubmitting(true);
    try {
      const response = await dashboardRequest<CreateResponse>(
        "/api/recruiter/interviews",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            startsAt: form.startsAt || undefined,
            candidateEmails: candidates.map((candidate) => candidate.email),
          }),
        }
      );
      toast.success(response.message);
      router.push(`/recruiter/interviews/${response.campaignId}`);
    } catch (error) {
      if (
        error instanceof DashboardApiError &&
        Array.isArray(error.payload?.invalidEmails)
      ) {
        toast.error(
          `Ứng viên không hợp lệ: ${error.payload.invalidEmails.join(", ")}`
        );
      } else {
        toast.error(
          error instanceof Error ? error.message : "Không thể tạo phỏng vấn"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DashboardPageHeader
        title="Tạo cuộc phỏng vấn"
        description="Cấu hình nội dung, lịch thực hiện và danh sách ứng viên cho một chiến dịch phỏng vấn AI."
      />

      <form
        onSubmit={submit}
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-5">
          <section className="rounded-lg border border-border/70 bg-card">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <BriefcaseBusiness className="size-4 text-primary" />
              <h3 className="text-sm font-extrabold">Vị trí tuyển dụng</h3>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-bold text-foreground">
                  Tên chiến dịch *
                </span>
                <Input
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Tuyển Backend Engineer quý III"
                  maxLength={160}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Vị trí *
                </span>
                <Input
                  value={form.jobTitle}
                  onChange={(event) => update("jobTitle", event.target.value)}
                  placeholder="Backend Engineer"
                  maxLength={120}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Phòng ban
                </span>
                <Input
                  value={form.department}
                  onChange={(event) => update("department", event.target.value)}
                  placeholder="Engineering"
                  maxLength={120}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Ngành *
                </span>
                <Input
                  value={form.industry}
                  onChange={(event) => update("industry", event.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Địa điểm
                </span>
                <Input
                  value={form.location}
                  onChange={(event) => update("location", event.target.value)}
                  placeholder="TP. Hồ Chí Minh"
                  maxLength={200}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Loại hợp đồng
                </span>
                <DashboardSelect
                  value={form.employmentType}
                  onValueChange={(value) => update("employmentType", value)}
                  ariaLabel="Loại hợp đồng"
                  options={[
                    { value: "FULL_TIME", label: "Toàn thời gian" },
                    { value: "PART_TIME", label: "Bán thời gian" },
                    { value: "CONTRACT", label: "Hợp đồng" },
                    { value: "INTERNSHIP", label: "Thực tập" },
                  ]}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Hình thức làm việc
                </span>
                <DashboardSelect
                  value={form.workMode}
                  onValueChange={(value) => update("workMode", value)}
                  ariaLabel="Hình thức làm việc"
                  options={[
                    { value: "ONSITE", label: "Tại văn phòng" },
                    { value: "HYBRID", label: "Kết hợp" },
                    { value: "REMOTE", label: "Từ xa" },
                  ]}
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-cyan-500" />
                <h3 className="text-sm font-extrabold">Nội dung phỏng vấn</h3>
              </div>
              <div>
                <input
                  ref={jdFileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="sr-only"
                  onChange={(event) =>
                    void handleJdFile(event.target.files?.[0])
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={extractingJd}
                  onClick={() => jdFileRef.current?.click()}
                >
                  {extractingJd ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <FileUp className="size-4" />
                  )}
                  {extractingJd
                    ? `Đang đọc ${jdProgress}%`
                    : "Nhập từ file JD"}
                </Button>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Mô tả công việc *
                </span>
                <Textarea
                  value={form.jobDescription}
                  onChange={(event) =>
                    update("jobDescription", event.target.value)
                  }
                  placeholder="Trách nhiệm, kỹ năng bắt buộc, yêu cầu kinh nghiệm..."
                  className="min-h-56 resize-y"
                  maxLength={50_000}
                  required
                />
                <span className="block text-right text-[11px] text-muted-foreground">
                  {form.jobDescription.length.toLocaleString("vi-VN")} / 50.000
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  Trọng tâm bổ sung
                </span>
                <Textarea
                  value={form.topic}
                  onChange={(event) => update("topic", event.target.value)}
                  placeholder="System design, xử lý sự cố production, giao tiếp liên phòng ban..."
                  className="min-h-24 resize-y"
                  maxLength={2_000}
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <Settings2 className="size-4 text-violet-500" />
              <h3 className="text-sm font-extrabold">Cấu hình AI & Giọng nói</h3>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Cấp độ</span>
                <DashboardSelect
                  value={form.difficulty}
                  onValueChange={(value) => update("difficulty", value)}
                  ariaLabel="Cấp độ"
                  options={[
                    { value: "Fresher", label: "Fresher" },
                    { value: "Junior", label: "Junior" },
                    { value: "Middle", label: "Middle" },
                    { value: "Senior", label: "Senior" },
                  ]}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Số câu hỏi</span>
                <DashboardSelect
                  value={String(form.questionCount)}
                  onValueChange={(value) =>
                    update("questionCount", Number(value))
                  }
                  ariaLabel="Số câu hỏi"
                  options={[5, 6, 7, 8, 10, 12, 15, 20, 25].map((count) => ({
                    value: String(count),
                    label: `${count} câu`,
                  }))}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Ngôn ngữ phỏng vấn</span>
                <DashboardSelect
                  value={form.language}
                  onValueChange={handleLanguageChange}
                  ariaLabel="Ngôn ngữ phỏng vấn"
                  options={LANGUAGE_OPTIONS.map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                />
              </label>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Volume2 className="size-3.5" />
                    Giọng phỏng vấn
                  </span>
                  {selectedVoice?.gender && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {getVoiceGenderLabel(selectedVoice.gender)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <DashboardSelect
                      value={form.voiceId}
                      disabled={loadingVoices}
                      onValueChange={handleVoiceChange}
                      ariaLabel="Giọng phỏng vấn"
                      options={
                        voices.length === 0
                          ? [
                              {
                                value: form.voiceId,
                                label: loadingVoices
                                  ? "Đang tải danh sách giọng..."
                                  : form.voiceId,
                              },
                            ]
                          : voices.map((voice) => ({
                              value: voice.id,
                              label: `${voice.name}${
                                voice.gender
                                  ? ` (${getVoiceGenderLabel(voice.gender)})`
                                  : ""
                              }`,
                            }))
                      }
                      triggerClassName="disabled:opacity-60"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handlePreviewVoice()}
                    disabled={loadingVoices || !form.voiceId}
                    className="size-9 shrink-0 p-0 flex items-center justify-center cursor-pointer border border-border/70 hover:bg-accent"
                    title={
                      isVoicePreviewPlaying
                        ? "Ngừng phát"
                        : isPreviewingVoice
                        ? "Đang chuẩn bị giọng..."
                        : "Nghe thử giọng"
                    }
                  >
                    {isPreviewingVoice ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : isVoicePreviewPlaying ? (
                      <VolumeX className="size-4 text-primary" />
                    ) : (
                      <Volume2 className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            {/* Sample text hint and status */}
            <div className="border-t border-border/40 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground truncate">
                Mẫu câu thử: <span className="text-foreground italic">"{selectedLanguageOption.sample}"</span>
              </span>
              {isVoicePreviewPlaying && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0 animate-pulse">
                  <span className="size-2 rounded-full bg-primary" />
                  Đang phát
                </span>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <CalendarDays className="size-4 text-amber-500" />
              <h3 className="text-sm font-extrabold">Lịch thực hiện</h3>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <span className="text-xs font-bold">Bắt đầu</span>
                <DateTimePickerInput
                  value={form.startsAt}
                  onChange={(val) => update("startsAt", val)}
                  placeholder="Thời gian bắt đầu..."
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold">Hạn hoàn thành *</span>
                <DateTimePickerInput
                  value={form.endsAt}
                  min={form.startsAt || minimumEnd}
                  onChange={(val) => update("endsAt", val)}
                  placeholder="Chọn hạn hoàn thành..."
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold">Số lượt tối đa</span>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    min={1}
                    value={form.maxAttempts}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        update("maxAttempts", Math.max(1, val));
                      } else if (e.target.value === "") {
                        update("maxAttempts", 1);
                      }
                    }}
                    className="h-9 pr-22 pl-3 text-xs sm:text-sm font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-16 text-xs text-muted-foreground font-medium select-none">
                    lượt
                  </span>
                  {/* Pill-shaped dual button container */}
                  <div className="absolute right-1.5 flex items-center rounded-full border border-border/80 bg-muted/60 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        update("maxAttempts", Math.max(1, form.maxAttempts - 1))
                      }
                      disabled={form.maxAttempts <= 1}
                      title="Giảm 1 lượt"
                      aria-label="Giảm 1 lượt"
                      className="flex size-6 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30 cursor-pointer"
                    >
                      <MinusIcon className="size-3" />
                    </button>
                    <div className="h-3 w-px bg-border/80" />
                    <button
                      type="button"
                      onClick={() =>
                        update("maxAttempts", form.maxAttempts + 1)
                      }
                      title="Tăng 1 lượt"
                      aria-label="Tăng 1 lượt"
                      className="flex size-6 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-95 cursor-pointer"
                    >
                      <PlusIcon className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <Users className="size-4 text-emerald-500" />
              <h3 className="text-sm font-extrabold">
                Ứng viên ({candidates.length})
              </h3>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={candidateQuery}
                  onChange={(event) => setCandidateQuery(event.target.value)}
                  placeholder="Tìm email hoặc username của ứng viên"
                  className="pl-9 pr-10"
                />
                {searchingCandidates && (
                  <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {candidateQuery.trim().length >= 2 &&
                  suggestions.length > 0 && (
                  <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
                    {suggestions.map((candidate) => (
                      <button
                        type="button"
                        key={candidate.id}
                        onClick={() => addCandidate(candidate)}
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-accent cursor-pointer"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {candidate.username}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {candidate.email}
                          </span>
                        </span>
                        <Plus className="size-4 shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                  )}
              </div>
              <div className="mt-3 divide-y divide-border/60 rounded-lg border border-border/70">
                {candidates.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Mail className="mx-auto size-7 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      Chưa chọn ứng viên
                    </p>
                  </div>
                ) : (
                  candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {candidate.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {candidate.email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Bỏ ứng viên"
                        aria-label={`Bỏ ${candidate.username}`}
                        onClick={() =>
                          setCandidates((current) =>
                            current.filter((item) => item.id !== candidate.id)
                          )
                        }
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <label className="mt-4 block space-y-1.5">
                <span className="text-xs font-bold">Lời nhắn trong email</span>
                <Textarea
                  value={form.invitationMessage}
                  onChange={(event) =>
                    update("invitationMessage", event.target.value)
                  }
                  placeholder="Thông tin bổ sung dành cho ứng viên..."
                  maxLength={2_000}
                  className="min-h-24 resize-y"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="sticky top-6 self-start rounded-lg border border-border/70 bg-card shadow-xs">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold">Tóm tắt chiến dịch</h3>
          </div>
          <dl className="divide-y divide-border/60">
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">
                Vị trí
              </dt>
              <dd className="mt-1 text-sm font-bold">
                {form.jobTitle || "Chưa nhập"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <div>
                <dt className="text-[11px] font-semibold text-muted-foreground">
                  Cấp độ
                </dt>
                <dd className="mt-1 text-sm font-bold">{form.difficulty}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-muted-foreground">
                  Số câu
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  {form.questionCount}
                </dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <div>
                <dt className="text-[11px] font-semibold text-muted-foreground">
                  Ứng viên
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  {candidates.length}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-muted-foreground">
                  Thời lượng
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  ~{estimatedMinutes} phút
                </dd>
              </div>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">
                Ngôn ngữ
              </dt>
              <dd className="mt-1 truncate text-sm font-bold">
                {selectedLanguageOption.label}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">
                Giọng đọc
              </dt>
              <dd className="mt-1 truncate text-sm font-bold">
                {selectedVoice?.name || form.voiceId}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">
                Hạn hoàn thành
              </dt>
              <dd className="mt-1 text-sm font-bold">
                {form.endsAt
                  ? new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(form.endsAt))
                  : "Chưa chọn"}
              </dd>
            </div>
            {/* Credit Cost Summary */}
            <div className="px-4 py-3 bg-muted/25 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Số dư hiện tại:</span>
                <span className="font-bold">{userCredits.toLocaleString("vi-VN")} Credits</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Chi phí chiến dịch:</span>
                <span className="font-bold text-amber-500">
                  {totalCost.toLocaleString("vi-VN")} Credits
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ({candidates.length} ứng viên × {costPerCandidate} Credits/lượt)
              </p>
              <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
                <span className="font-semibold text-muted-foreground">Số dư sau tạo:</span>
                <span className={`font-bold ${remainingCredits < 0 ? "text-destructive" : "text-foreground"}`}>
                  {remainingCredits.toLocaleString("vi-VN")} Credits
                </span>
              </div>
            </div>
          </dl>

          {userCredits < totalCost && candidates.length > 0 && (
            <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1.5">
              <p className="font-bold">Số dư Credits không đủ</p>
              <p className="leading-relaxed">
                Bạn cần <strong>{totalCost.toLocaleString("vi-VN")} Credits</strong> để tạo chiến dịch này (còn thiếu <strong>{(totalCost - userCredits).toLocaleString("vi-VN")} Credits</strong>).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/credit")}
                className="w-full mt-1 text-xs font-bold border-destructive/40 hover:bg-destructive/20 cursor-pointer"
              >
                Nạp thêm Credits
              </Button>
            </div>
          )}

          <div className="space-y-2 p-4">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full cursor-pointer"
            >
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {submitting
                ? "Đang tạo..."
                : !hasSufficientCredits && candidates.length > 0
                ? "Không đủ Credits"
                : "Tạo và gửi thư mời"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/recruiter/interviews")}
              disabled={submitting}
              className="w-full cursor-pointer"
            >
              Hủy
            </Button>
          </div>
        </aside>
      </form>
    </>
  );
}
