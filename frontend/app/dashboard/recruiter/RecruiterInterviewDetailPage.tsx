"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarMark as CalendarClock,
  CheckCircle as CheckCircle2,
  Clipboard,
  Eye,
  LetterUnread as MailPlus,
  LetterUnread as MailWarning,
  PauseCircle,
  PlayCircle,
  Refresh as RefreshCw,
  SendSquare as Send,
  UserPlus,
  UsersGroupRounded as Users,
  CloseCircle as XCircle,
} from "@solar-icons/react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
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

interface InterviewResult {
  score: number;
  duration?: string;
  feedback?: string;
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
  const [data, setData] = useState<CampaignDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState(false);
  const [showAddCandidates, setShowAddCandidates] = useState(false);
  const [candidateEmails, setCandidateEmails] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [showDeadline, setShowDeadline] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [selectedResult, setSelectedResult] = useState<Invitation | null>(null);

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
    const emails = Array.from(
      new Set(
        candidateEmails
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (emails.length === 0) {
      toast.error("Nhập ít nhất một email");
      return;
    }
    setMutating(true);
    try {
      await dashboardRequest(
        `/api/recruiter/interviews/${campaignId}/candidates`,
        {
          method: "POST",
          body: JSON.stringify({ candidateEmails: emails }),
        }
      );
      toast.success("Đã thêm ứng viên và xếp hàng gửi thư mời");
      setCandidateEmails("");
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
        eyebrow={campaign.jobTitle}
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
                <dd className="font-bold">{campaign.language}</dd>
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
        onOpenChange={(open) => !mutating && setShowAddCandidates(open)}
      >
        <DialogContent className="rounded-lg sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <MailPlus className="size-5" />
            </div>
            <DialogTitle className="font-extrabold">Thêm ứng viên</DialogTitle>
            <DialogDescription>
              Nhập email tài khoản ứng viên, phân tách bằng dấu phẩy hoặc xuống
              dòng.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={candidateEmails}
            onChange={(event) => setCandidateEmails(event.target.value)}
            placeholder={"candidate1@example.com\ncandidate2@example.com"}
            className="min-h-36 resize-y"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutating}
              onClick={() => setShowAddCandidates(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={mutating}
              onClick={() => void addCandidates()}
            >
              {mutating ? "Đang thêm..." : "Thêm và gửi email"}
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
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
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
