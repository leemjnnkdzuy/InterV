"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { aiService } from "@/app/services/AiService";
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

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

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
    voiceId: "vi-VN-HoaiMyNeural",
    difficulty: "Middle",
    questionCount: 5,
    maxAttempts: 1,
    startsAt: "",
    endsAt: defaultEnd,
    invitationMessage: "",
  });

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    const loadVoices = async () => {
      setLoadingVoices(true);
      try {
        const response = (await dashboardRequest<VoiceResponse>(
          `/api/ai/voices?language=${encodeURIComponent(form.language)}`
        )) as VoiceResponse;
        if (cancelled) return;
        setVoices(response.voices);
        if (
          response.voices.length > 0 &&
          !response.voices.some((voice) => voice.id === form.voiceId)
        ) {
          update("voiceId", response.voices[0].id);
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
  }, [form.language]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectedVoice = voices.find((voice) => voice.id === form.voiceId);
  const estimatedMinutes = Math.max(8, form.questionCount * 2);
  const canSubmit = useMemo(
    () =>
      form.title.trim().length >= 3 &&
      form.jobTitle.trim().length >= 2 &&
      form.industry.trim().length >= 2 &&
      form.jobDescription.trim().length >= 20 &&
      Boolean(form.endsAt) &&
      candidates.length > 0 &&
      !submitting,
    [candidates.length, form, submitting]
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
        eyebrow="New Interview"
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
              <h3 className="text-sm font-extrabold">Cấu hình AI</h3>
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
                <span className="text-xs font-bold">Ngôn ngữ</span>
                <DashboardSelect
                  value={form.language}
                  onValueChange={(value) => update("language", value)}
                  ariaLabel="Ngôn ngữ"
                  options={[
                    { value: "vi-VN", label: "Tiếng Việt" },
                    { value: "en-US", label: "English" },
                    { value: "zh-CN", label: "中文" },
                  ]}
                />
              </label>
              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Volume2 className="size-3.5" />
                  Giọng phỏng vấn
                </span>
                <DashboardSelect
                  value={form.voiceId}
                  disabled={loadingVoices}
                  onValueChange={(value) => update("voiceId", value)}
                  ariaLabel="Giọng phỏng vấn"
                  options={
                    voices.length === 0
                      ? [
                          {
                            value: form.voiceId,
                            label: loadingVoices
                              ? "Đang tải giọng..."
                              : form.voiceId,
                          },
                        ]
                      : voices.map((voice) => ({
                          value: voice.id,
                          label: `${voice.name}${voice.gender ? ` (${voice.gender})` : ""}`,
                        }))
                  }
                  triggerClassName="disabled:opacity-60"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-card">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <CalendarDays className="size-4 text-amber-500" />
              <h3 className="text-sm font-extrabold">Lịch thực hiện</h3>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Bắt đầu</span>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => update("startsAt", event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Hạn hoàn thành *</span>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  min={minimumEnd}
                  onChange={(event) => update("endsAt", event.target.value)}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Số lượt tối đa</span>
                <DashboardSelect
                  value={String(form.maxAttempts)}
                  onValueChange={(value) =>
                    update("maxAttempts", Number(value))
                  }
                  ariaLabel="Số lượt tối đa"
                  options={[
                    { value: "1", label: "1 lượt" },
                    { value: "2", label: "2 lượt" },
                    { value: "3", label: "3 lượt" },
                  ]}
                />
              </label>
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
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
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
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
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

        <aside className="sticky top-21 rounded-lg border border-border/70 bg-card">
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
          </dl>
          <div className="space-y-2 p-4">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full"
            >
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {submitting ? "Đang tạo..." : "Tạo và gửi thư mời"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/recruiter/interviews")}
              disabled={submitting}
              className="w-full"
            >
              Hủy
            </Button>
          </div>
        </aside>
      </form>
    </>
  );
}
