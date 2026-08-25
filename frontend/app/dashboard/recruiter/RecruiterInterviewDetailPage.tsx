"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarMark as CalendarClock,
  CheckCircle as CheckCircle2,
  Clipboard,
  Eye,
  Letter as Mail,
  LetterUnread as MailPlus,
  LetterUnread as MailWarning,
  PauseCircle,
  PlayCircle,
  AddCircle as Plus,
  Refresh as RefreshCw,
  Refresh as LoaderCircle,
  Magnifier as Search,
  SendSquare as Send,
  TrashBin2 as Trash2,
  UserPlus,
  UsersGroupRounded as Users,
  CloseCircle as XCircle,
} from "@solar-icons/react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { QUESTION_CREDIT_COST } from "@/app/lib/PracticeBilling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { DateTimePickerInput } from "@/app/components/ui/date-picker";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  EmptyState,
  formatDashboardDate,
  MetricCard,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import {
  DashboardApiError,
  dashboardRequest,
} from "@/app/dashboard/lib/client";

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

interface InterviewResult {
  score: number;
  duration?: string;
  feedback?: string;
  candidateIntro?: {
    transcript: string;
  };
  candidateIntroItems?: Array<{
    category: string;
    label: string;
    value: string;
    evidence?: string[];
  }>;
  ratings?: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

interface CampaignDetailResponse {
  success: true;
  campaign: {
    id: string;
    title: string;
    jobTitle: string;
    department?: string;
    industry: string;
    employmentType: string;
    workMode: string;
    location?: string;
    jobDescription: string;
    topic?: string;
    language: string;
    voiceId: string;
    difficulty: string;
    questionCount: number;
    maxAttempts: number;
    startsAt?: string;
    endsAt: string;
    invitationMessage?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  invitations: Array<{
    id: string;
    candidate: {
      id: string;
      username: string;
      email: string;
      avatar?: string;
      isActive: boolean;
    } | null;
    practiceSessionId: string;
    status: string;
    emailStatus: string;
    emailAttempts: number;
    emailLastError?: string;
    invitedAt: string;
    sentAt?: string;
    viewedAt?: string;
    startedAt?: string;
    completedAt?: string;
    expiresAt: string;
    finalScore?: number;
    attemptCount: number;
    latestResult?: InterviewResult;
  }>;
}

type Invitation = CampaignDetailResponse["invitations"][number];

const statusLabels: Record<string, string> = {
  ACTIVE: "Đang mở",
  CLOSED: "Đã đóng",
  ARCHIVED: "Lưu trữ",
  INVITED: "Đã mời",
  VIEWED: "Đã xem",
  IN_PROGRESS: "Đang phỏng vấn",
  COMPLETED: "Hoàn thành",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
  SENT: "Đã gửi",
  PENDING: "Chờ gửi",
  SENDING: "Đang gửi",
  FAILED: "Gửi lỗi",
};

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function RecruiterInterviewDetailPage({
  campaignId,
}: {
  campaignId: string;
}) {
  const { user } = useAuthContext();
  const [data, setData] = useState<CampaignDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState(false);
  const [showAddCandidates, setShowAddCandidates] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<CandidateSuggestion[]>([]);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [suggestions, setSuggestions] = useState<CandidateSuggestion[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [showDeadline, setShowDeadline] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [selectedResult, setSelectedResult] = useState<Invitation | null>(null);

  const addCandidateCost = useMemo(() => {
    const costPerCandidate =
      (data?.campaign.questionCount || 5) * QUESTION_CREDIT_COST;
    return selectedCandidates.length * costPerCandidate;
  }, [selectedCandidates.length, data?.campaign.questionCount]);

  const userCredits = user?.credits || 0;
  const hasSufficientCreditsForAdd =
    selectedCandidates.length === 0 || userCredits >= addCandidateCost;

  useEffect(() => {
    const query = candidateQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
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
          const existingEmails = new Set(
            (data?.invitations || [])
              .map((i) => i.candidate?.email?.toLowerCase())
              .filter(Boolean)
          );
          const existingIds = new Set(
            (data?.invitations || [])
              .map((i) => i.candidate?.id)
              .filter(Boolean)
          );
          const selectedIds = new Set(selectedCandidates.map((c) => c.id));
          const selectedEmails = new Set(
            selectedCandidates.map((c) => c.email.toLowerCase())
          );

          setSuggestions(
            response.candidates.filter(
              (candidate) =>
                !existingIds.has(candidate.id) &&
                !existingEmails.has(candidate.email.toLowerCase()) &&
                !selectedIds.has(candidate.id) &&
                !selectedEmails.has(candidate.email.toLowerCase())
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
  }, [candidateQuery, data?.invitations, selectedCandidates]);

  const addCandidate = (candidate: CandidateSuggestion) => {
    setSelectedCandidates((current) =>
      current.some((item) => item.id === candidate.id)
        ? current
        : [...current, candidate]
    );
    setCandidateQuery("");
    setSuggestions([]);
  };

  const removeCandidate = (id: string) => {
    setSelectedCandidates((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const handleOpenAddCandidates = (open: boolean) => {
    if (!mutating) {
      setShowAddCandidates(open);
      if (!open) {
        setCandidateQuery("");
        setSuggestions([]);
        setSelectedCandidates([]);
      }
    }
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await dashboardRequest<CampaignDetailResponse>(
        `/api/recruiter/interviews/${campaignId}`
      );
      setData(response);
      setDeadline(localDateTime(response.campaign.endsAt));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải chiến dịch"
      );
    }
  }, [campaignId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const invitations = data?.invitations || [];
    return {
      total: invitations.length,
      completed: invitations.filter((item) => item.status === "COMPLETED")
        .length,
      inProgress: invitations.filter((item) => item.status === "IN_PROGRESS")
        .length,
      emailFailures: invitations.filter((item) => item.emailStatus === "FAILED")
        .length,
      averageScore:
        invitations.filter((item) => item.finalScore !== undefined).length > 0
          ? Math.round(
              invitations.reduce(
                (sum, item) => sum + (item.finalScore || 0),
                0
              ) /
                invitations.filter((item) => item.finalScore !== undefined)
                  .length
            )
          : 0,
    };
  }, [data]);

  const updateCampaign = async (updates: Record<string, unknown>) => {
    setMutating(true);
    try {
      await dashboardRequest(`/api/recruiter/interviews/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      toast.success("Đã cập nhật chiến dịch");
      setShowArchive(false);
      setShowDeadline(false);
      await load();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Không thể cập nhật"
      );
    } finally {
      setMutating(false);
    }
  };

  const addCandidates = async () => {
    if (selectedCandidates.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ứng viên");
      return;
    }
    if (!hasSufficientCreditsForAdd) {
      toast.error(
        `Không đủ Credits. Bạn cần ${addCandidateCost.toLocaleString("vi-VN")} Credits để thêm ${selectedCandidates.length} ứng viên.`
      );
      return;
    }
    setMutating(true);
    try {
      await dashboardRequest(
        `/api/recruiter/interviews/${campaignId}/candidates`,
        {
          method: "POST",
          body: JSON.stringify({
            candidateEmails: selectedCandidates.map((c) => c.email),
          }),
        }
      );
      toast.success("Đã thêm ứng viên và xếp hàng gửi thư mời");
      setSelectedCandidates([]);
      setCandidateQuery("");
      setSuggestions([]);
      setShowAddCandidates(false);
      await load();
    } catch (mutationError) {
      if (mutationError instanceof DashboardApiError) {
        const invalid = mutationError.payload?.invalidEmails;
        const duplicate = mutationError.payload?.duplicateEmails;
        if (Array.isArray(invalid) || Array.isArray(duplicate)) {
          const affectedEmails = Array.isArray(invalid)
            ? invalid
            : Array.isArray(duplicate)
              ? duplicate
              : [];
          toast.error(
            `${mutationError.message}: ${affectedEmails.map(String).join(", ")}`
          );
        } else {
          toast.error(mutationError.message);
        }
      } else {
        toast.error("Không thể thêm ứng viên");
      }
    } finally {
      setMutating(false);
    }
  };

  const invitationAction = async (
    invitation: Invitation,
    action: "cancel" | "resend"
  ) => {
    setMutating(true);
    try {
      await dashboardRequest(
        `/api/recruiter/interviews/${campaignId}/candidates/${invitation.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ action }),
        }
      );
      toast.success(
        action === "resend" ? "Đã gửi lại lời mời" : "Đã hủy lời mời"
      );
      await load();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Không thể cập nhật lời mời"
      );
    } finally {
      setMutating(false);
    }
  };

  if (!data && !error) {
    return <DashboardLoading label="Đang tải chi tiết cuộc phỏng vấn" />;
  }
  if (error || !data) {
    return <DashboardError message={error} onRetry={() => void load()} />;
  }

  const campaign = data.campaign;
  const canManage = ["ACTIVE", "DRAFT"].includes(campaign.status);

  return (
    <>
      <DashboardPageHeader
        title={campaign.title}
        description={`${campaign.industry}${campaign.department ? ` · ${campaign.department}` : ""}`}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              Làm mới
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeadline(true)}
              disabled={campaign.status === "ARCHIVED"}
            >
              <CalendarClock className="size-4" />
              Đổi hạn
            </Button>
            {campaign.status === "ACTIVE" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void updateCampaign({ status: "CLOSED" })}
                disabled={mutating}
              >
                <PauseCircle className="size-4" />
                Đóng
              </Button>
            ) : campaign.status === "CLOSED" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void updateCampaign({ status: "ACTIVE" })}
                disabled={mutating}
              >
                <PlayCircle className="size-4" />
                Mở lại
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddCandidates(true)}
              disabled={!canManage}
            >
              <UserPlus className="size-4" />
              Thêm ứng viên
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Tổng ứng viên"
          value={metrics.total}
          icon={Users}
          tone="cyan"
        />
        <MetricCard
          label="Đang phỏng vấn"
          value={metrics.inProgress}
          icon={PlayCircle}
          tone="violet"
        />
        <MetricCard
          label="Hoàn thành"
          value={metrics.completed}
          icon={CheckCircle2}
          tone="lime"
        />
        <MetricCard
          label="Điểm trung bình"
          value={metrics.averageScore ? `${metrics.averageScore}/100` : "N/A"}
          icon={Eye}
          tone="amber"
        />
        <MetricCard
          label="Email lỗi"
          value={metrics.emailFailures}
          icon={MailWarning}
          tone={metrics.emailFailures > 0 ? "rose" : "neutral"}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold">Tiến độ ứng viên</h3>
            <StatusBadge
              value={campaign.status}
              label={statusLabels[campaign.status] || campaign.status}
            />
          </div>
          {data.invitations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Chưa có ứng viên"
                action={
                  canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowAddCandidates(true)}
                    >
                      <UserPlus className="size-4" />
                      Thêm ứng viên
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Ứng viên</th>
                    <th className="px-4 py-3 font-bold">Tiến độ</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 text-center font-bold">Lượt</th>
                    <th className="px-4 py-3 text-center font-bold">Điểm</th>
                    <th className="px-4 py-3 font-bold">Cập nhật</th>
                    <th className="px-4 py-3 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.invitations.map((invitation) => {
                    const canChange = ![
                      "IN_PROGRESS",
                      "COMPLETED",
                    ].includes(invitation.status);
                    return (
                      <tr key={invitation.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold">
                            {invitation.candidate?.username || "Không xác định"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invitation.candidate?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={invitation.status}
                            label={
                              statusLabels[invitation.status] ||
                              invitation.status
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={invitation.emailStatus}
                            label={
                              statusLabels[invitation.emailStatus] ||
                              invitation.emailStatus
                            }
                          />
                          {invitation.emailLastError && (
                            <p
                              className="mt-1 max-w-40 truncate text-[10px] text-destructive"
                              title={invitation.emailLastError}
                            >
                              {invitation.emailLastError}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold">
                          {invitation.attemptCount}/{campaign.maxAttempts}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-extrabold">
                          {invitation.finalScore !== undefined
                            ? Math.round(invitation.finalScore)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDashboardDate(
                            invitation.completedAt ||
                              invitation.startedAt ||
                              invitation.viewedAt ||
                              invitation.sentAt ||
                              invitation.invitedAt
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Sao chép liên kết"
                              aria-label="Sao chép liên kết phỏng vấn"
                              onClick={() => {
                                void navigator.clipboard.writeText(
                                  `${window.location.origin}/practice/${invitation.practiceSessionId}`
                                );
                                toast.success("Đã sao chép liên kết");
                              }}
                              className="size-8"
                            >
                              <Clipboard className="size-4" />
                            </Button>
                            {invitation.latestResult && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Xem kết quả"
                                aria-label="Xem kết quả"
                                onClick={() => setSelectedResult(invitation)}
                                className="size-8"
                              >
                                <Eye className="size-4" />
                              </Button>
                            )}
                            {canChange && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Gửi lại email"
                                  aria-label="Gửi lại email"
                                  disabled={mutating}
                                  onClick={() =>
                                    void invitationAction(invitation, "resend")
                                  }
                                  className="size-8 text-cyan-600"
                                >
                                  <Send className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title="Hủy lời mời"
                                  aria-label="Hủy lời mời"
                                  disabled={mutating}
                                  onClick={() =>
                                    void invitationAction(invitation, "cancel")
                                  }
                                  className="size-8 text-destructive"
                                >
                                  <XCircle className="size-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-border/70 bg-card">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-extrabold">Cấu hình</h3>
            </div>
            <dl className="divide-y divide-border/60 text-xs">
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Vị trí</dt>
                <dd className="text-right font-bold">{campaign.jobTitle}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Cấp độ</dt>
                <dd className="font-bold">{campaign.difficulty}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Số câu</dt>
                <dd className="font-bold">{campaign.questionCount}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Ngôn ngữ</dt>
                <dd className="font-bold">
                  {campaign.language === "vi-VN"
                    ? "Tiếng Việt"
                    : campaign.language === "en-US"
                    ? "English"
                    : campaign.language === "zh-CN"
                    ? "中文"
                    : campaign.language}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Giọng đọc</dt>
                <dd className="font-bold truncate max-w-[170px]" title={campaign.voiceId}>
                  {campaign.voiceId}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Bắt đầu</dt>
                <dd className="text-right font-bold">
                  {formatDashboardDate(campaign.startsAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">Hạn</dt>
                <dd className="text-right font-bold">
                  {formatDashboardDate(campaign.endsAt)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border/70 bg-card">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-extrabold">Mô tả công việc</h3>
            </div>
            <div className="max-h-80 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-6 text-muted-foreground">
              {campaign.jobDescription}
            </div>
          </div>

          {campaign.status !== "ARCHIVED" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowArchive(true)}
              className="w-full text-destructive hover:text-destructive"
            >
              <Archive className="size-4" />
              Lưu trữ chiến dịch
            </Button>
          )}
        </aside>
      </section>

      <Dialog
        open={showAddCandidates}
        onOpenChange={handleOpenAddCandidates}
      >
        <DialogContent className="rounded-2xl sm:max-w-lg overflow-visible">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MailPlus className="size-5" />
            </div>
            <DialogTitle className="font-extrabold text-base sm:text-lg">
              Thêm ứng viên vào chiến dịch
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Tìm kiếm theo username hoặc email để chọn ứng viên. Ứng viên đã có trong chiến dịch sẽ tự động được ẩn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input with dropdown suggestions */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={candidateQuery}
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="Tìm email hoặc username của ứng viên..."
                className="pl-9 pr-10 h-9.5 text-xs sm:text-sm"
              />
              {searchingCandidates && (
                <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}

              {candidateQuery.trim().length >= 2 && suggestions.length > 0 && (
                <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
                  {suggestions.map((candidate) => (
                    <button
                      type="button"
                      key={candidate.id}
                      onClick={() => addCandidate(candidate)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {candidate.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-bold text-foreground">
                            {candidate.username}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {candidate.email}
                          </span>
                        </div>
                      </div>
                      <Plus className="size-4 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              )}

              {candidateQuery.trim().length >= 2 &&
                !searchingCandidates &&
                suggestions.length === 0 && (
                  <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 rounded-xl border border-border bg-popover p-3 text-center text-xs text-muted-foreground shadow-xl">
                    Không tìm thấy ứng viên mới phù hợp (hoặc ứng viên đã có trong danh sách).
                  </div>
                )}
            </div>

            {/* Selected Candidates Box */}
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
              <div className="bg-muted/40 px-3.5 py-2 border-b border-border/60 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  Ứng viên đã chọn ({selectedCandidates.length})
                </span>
                {selectedCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCandidates([])}
                    className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                {selectedCandidates.length === 0 ? (
                  <div className="px-4 py-6 text-center text-muted-foreground">
                    <Mail className="mx-auto size-6 text-muted-foreground/50 mb-1.5" />
                    <p className="text-xs font-medium">
                      Chưa chọn ứng viên nào. Hãy tìm kiếm ở trên để thêm.
                    </p>
                  </div>
                ) : (
                  selectedCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-6 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                          {candidate.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">
                            {candidate.username}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {candidate.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Bỏ ứng viên"
                        aria-label={`Bỏ ${candidate.username}`}
                        onClick={() => removeCandidate(candidate.id)}
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Credit Cost Summary */}
            {selectedCandidates.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-muted/25 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Số ứng viên thêm:</span>
                  <span className="font-bold">{selectedCandidates.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Chi phí cần trừ:</span>
                  <span className="font-bold text-amber-500">
                    {addCandidateCost.toLocaleString("vi-VN")} Credits
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  ({selectedCandidates.length} ứng viên × {((data?.campaign.questionCount || 5) * QUESTION_CREDIT_COST)} Credits/lượt)
                </p>
                <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                  <span className="text-muted-foreground">Số dư hiện tại:</span>
                  <span className="font-bold">{userCredits.toLocaleString("vi-VN")} Credits</span>
                </div>
                {!hasSufficientCreditsForAdd && (
                  <p className="text-[11px] font-bold text-destructive pt-1 leading-snug">
                    Số dư không đủ. Bạn cần nạp thêm {(addCandidateCost - userCredits).toLocaleString("vi-VN")} Credits để thực hiện.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutating}
              onClick={() => handleOpenAddCandidates(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                mutating ||
                !hasSufficientCreditsForAdd ||
                selectedCandidates.length === 0
              }
              onClick={() => void addCandidates()}
            >
              {mutating
                ? "Đang thêm..."
                : !hasSufficientCreditsForAdd
                ? "Không đủ Credits"
                : `Thêm ${selectedCandidates.length} ứng viên`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeadline}
        onOpenChange={(open) => !mutating && setShowDeadline(open)}
      >
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">
              Đổi hạn hoàn thành
            </DialogTitle>
            <DialogDescription>
              Hạn mới áp dụng cho các ứng viên chưa bắt đầu.
            </DialogDescription>
          </DialogHeader>
          <DateTimePickerInput
            value={deadline}
            min={new Date()}
            onChange={(val) => setDeadline(val)}
            placeholder="Chọn hạn mới..."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeadline(false)}
              disabled={mutating}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void updateCampaign({ endsAt: deadline })}
              disabled={mutating || !deadline}
            >
              Lưu hạn mới
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showArchive}
        onOpenChange={(open) => !mutating && setShowArchive(open)}
      >
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">
              Lưu trữ chiến dịch
            </DialogTitle>
            <DialogDescription>
              Các lời mời chưa hoàn thành sẽ bị hủy. Kết quả đã có vẫn được giữ
              trong lịch sử.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowArchive(false)}
              disabled={mutating}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void updateCampaign({ status: "ARCHIVED" })}
              disabled={mutating}
            >
              Lưu trữ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedResult)} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold">
              Kết quả {selectedResult?.candidate?.username}
            </DialogTitle>
            <DialogDescription>
              {selectedResult?.latestResult?.duration || "Phỏng vấn AI"} ·{" "}
              {formatDashboardDate(selectedResult?.completedAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedResult?.latestResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/70 p-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  Điểm tổng
                </span>
                <strong className="text-3xl font-extrabold text-primary">
                  {Math.round(selectedResult.latestResult.score)}/100
                </strong>
              </div>
              {selectedResult.latestResult.feedback && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">
                    Nhận xét
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {selectedResult.latestResult.feedback}
                  </p>
                </div>
              )}
              {selectedResult.latestResult.candidateIntroItems &&
                selectedResult.latestResult.candidateIntroItems.length > 0 && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">
                      Thông tin trích xuất từ phần giới thiệu
                    </h4>
                    <dl className="mt-3 divide-y divide-border/60">
                      {selectedResult.latestResult.candidateIntroItems.map(
                        (item, index) => (
                          <div
                            key={`${item.category}-${item.label}-${index}`}
                            className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-3"
                          >
                            <dt className="text-xs font-semibold text-muted-foreground">
                              {item.label}
                            </dt>
                            <dd className="whitespace-pre-wrap text-sm leading-6">
                              {item.value}
                            </dd>
                          </div>
                        )
                      )}
                    </dl>
                  </div>
                )}
              {selectedResult.latestResult.candidateIntro?.transcript && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">
                    Giới thiệu ứng viên
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {selectedResult.latestResult.candidateIntro.transcript}
                  </p>
                </div>
              )}
              {selectedResult.latestResult.ratings && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(selectedResult.latestResult.ratings).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                      >
                        <span className="text-xs capitalize text-muted-foreground">
                          {key}
                        </span>
                        <span className="text-sm font-extrabold">
                          {Math.round(value)}/100
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
              {[
                ["Điểm mạnh", selectedResult.latestResult.strengths],
                ["Điểm cần cải thiện", selectedResult.latestResult.weaknesses],
                ["Đề xuất", selectedResult.latestResult.recommendations],
              ].map(([title, items]) =>
                Array.isArray(items) && items.length > 0 ? (
                  <div key={title as string}>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">
                      {title as string}
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
