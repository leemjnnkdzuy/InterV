"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AltArrowRight,
  Bag,
  CalendarDate,
  CheckCircle,
  ClockCircle,
  DangerCircle,
  Inbox,
  LetterUnread,
  MapPoint,
  MedalStar,
  PlayCircle,
  Refresh,
  User,
  Videocamera,
} from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import api from "@/app/lib/Client";
import { cn } from "@/app/lib/Utils";
import type {
  RecruitmentInvitationStatus,
  UserInterviewItem,
  UserInterviewsResponse,
} from "@/app/types";

type InterviewFilter = "all" | "pending" | "inProgress" | "completed";

const EMPTY_RESPONSE: UserInterviewsResponse = {
  success: true,
  stats: {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  },
  interviews: [],
};

const STATUS_META: Record<
  RecruitmentInvitationStatus,
  { label: string; className: string }
> = {
  INVITED: {
    label: "Lời mời mới",
    className: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  },
  VIEWED: {
    label: "Chờ tham gia",
    className: "border-blue-500/25 bg-blue-500/10 text-blue-300",
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  },
  EXPIRED: {
    label: "Đã hết hạn",
    className: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "border-rose-500/25 bg-rose-500/10 text-rose-300",
  },
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Toàn thời gian",
  PART_TIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
  INTERNSHIP: "Thực tập",
};

const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "Tại văn phòng",
  HYBRID: "Kết hợp",
  REMOTE: "Từ xa",
};

const LANGUAGE_LABELS: Record<string, string> = {
  "vi-VN": "Tiếng Việt",
  "en-US": "Tiếng Anh",
  "zh-CN": "Tiếng Trung",
};

function dateTime(value?: string) {
  if (!value) return "Chưa ấn định";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function remainingTime(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  if (difference <= 0) return "Đã hết hạn";
  const hours = Math.ceil(difference / 3_600_000);
  if (hours < 24) return `Còn ${hours} giờ`;
  const days = Math.ceil(hours / 24);
  return `Còn ${days} ngày`;
}

function isPending(item: UserInterviewItem) {
  return item.status === "INVITED" || item.status === "VIEWED";
}

function canStartInterview(item: UserInterviewItem) {
  const now = Date.now();
  const campaign = item.campaign;
  return Boolean(
    campaign &&
      campaign.status === "ACTIVE" &&
      (!campaign.startsAt || new Date(campaign.startsAt).getTime() <= now) &&
      new Date(item.expiresAt).getTime() > now &&
      !["EXPIRED", "CANCELLED"].includes(item.status) &&
      item.attemptCount < item.maxAttempts
  );
}

function unavailableReason(item: UserInterviewItem) {
  if (!item.campaign) return "Chiến dịch không còn tồn tại";
  if (item.status === "CANCELLED") return "Nhà tuyển dụng đã hủy lời mời";
  if (
    item.status === "EXPIRED" ||
    new Date(item.expiresAt).getTime() <= Date.now()
  ) {
    return "Lời mời đã hết hạn";
  }
  if (item.campaign.status !== "ACTIVE") {
    return "Chiến dịch đã đóng";
  }
  if (
    item.campaign.startsAt &&
    new Date(item.campaign.startsAt).getTime() > Date.now()
  ) {
    return `Mở lúc ${dateTime(item.campaign.startsAt)}`;
  }
  if (item.attemptCount >= item.maxAttempts) {
    return "Đã sử dụng hết số lượt";
  }
  return "Hiện chưa thể tham gia";
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Videocamera;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex min-h-24 items-center justify-between rounded-lg border border-white/10 bg-card/55 px-5 py-4 shadow-sm backdrop-blur-md">
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-extrabold tracking-normal">{value}</p>
      </div>
      <div className={cn("flex size-10 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-5" weight="BoldDuotone" />
      </div>
    </div>
  );
}

function InterviewCard({ item }: { item: UserInterviewItem }) {
  const router = useRouter();
  const campaign = item.campaign;
  const status = STATUS_META[item.status];
  const canStart = canStartInterview(item);
  const hasResult = item.status === "COMPLETED" && Boolean(item.lastRunId);
  const attemptsLeft = Math.max(0, item.maxAttempts - item.attemptCount);
  const progress = Math.min(
    100,
    Math.round((item.attemptCount / Math.max(1, item.maxAttempts)) * 100)
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-lg border border-white/10 bg-card/65 shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-lg"
    >
      <div className="flex flex-col gap-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-bold",
                  status.className
                )}
              >
                {status.label}
              </span>
              {item.status !== "CANCELLED" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ClockCircle className="size-4" weight="BoldDuotone" />
                  {remainingTime(item.expiresAt)}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold tracking-normal text-foreground lg:text-2xl">
              {campaign?.title || "Buổi phỏng vấn không còn khả dụng"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-primary">
              {campaign?.jobTitle || "Không có thông tin vị trí"}
            </p>
          </div>

          {item.finalScore !== undefined && (
            <div className="flex min-w-24 items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">
              <MedalStar className="size-5" weight="BoldDuotone" />
              <div>
                <p className="text-[10px] font-semibold uppercase text-emerald-300/70">
                  Điểm
                </p>
                <p className="text-lg font-extrabold leading-none">
                  {Math.round(item.finalScore)}/100
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-x-6 gap-y-3 border-y border-white/8 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <User
              className="size-4 shrink-0 text-cyan-400"
              weight="BoldDuotone"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Nhà tuyển dụng
              </p>
              <p className="truncate font-bold">
                {item.recruiter?.username || "InterV Recruiter"}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <Bag
              className="size-4 shrink-0 text-amber-400"
              weight="BoldDuotone"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Hình thức
              </p>
              <p className="truncate font-bold">
                {campaign
                  ? `${EMPLOYMENT_LABELS[campaign.employmentType] || campaign.employmentType} · ${
                      WORK_MODE_LABELS[campaign.workMode] || campaign.workMode
                    }`
                  : "-"}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <MapPoint
              className="size-4 shrink-0 text-violet-400"
              weight="BoldDuotone"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Địa điểm
              </p>
              <p className="truncate font-bold">
                {campaign?.location ||
                  (campaign?.workMode === "REMOTE" ? "Từ xa" : "Chưa cập nhật")}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <CalendarDate
              className="size-4 shrink-0 text-emerald-400"
              weight="BoldDuotone"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Hạn hoàn thành
              </p>
              <p className="truncate font-bold">{dateTime(item.expiresAt)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0 space-y-4">
            {campaign?.invitationMessage && (
              <div className="flex gap-3 rounded-md bg-muted/35 px-4 py-3">
                <LetterUnread
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  weight="BoldDuotone"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  {campaign.invitationMessage}
                </p>
              </div>
            )}

            <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
              <span>
                <strong className="text-foreground">
                  {campaign?.questionCount || "-"}
                </strong>{" "}
                câu hỏi
              </span>
              <span>
                Cấp độ{" "}
                <strong className="text-foreground">
                  {campaign?.difficulty || "-"}
                </strong>
              </span>
              <span>
                Ngôn ngữ{" "}
                <strong className="text-foreground">
                  {campaign
                    ? LANGUAGE_LABELS[campaign.language] || campaign.language
                    : "-"}
                </strong>
              </span>
            </div>

            <div className="max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-muted-foreground">
                  Số lượt đã dùng
                </span>
                <span className="font-bold text-foreground">
                  {item.attemptCount}/{item.maxAttempts}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {hasResult && (
              <Button
                variant="outline"
                size="lg"
                className="h-10 rounded-lg px-4"
                onClick={() => router.push(`/practice/${encodeURIComponent(item.practiceSessionId)}/analysis?runId=${encodeURIComponent(item.lastRunId || "")}`)}
              >
                  <MedalStar className="size-4" weight="BoldDuotone" />
                  Xem kết quả
              </Button>
            )}

            {canStart ? (
              <Button
                size="lg"
                className="h-10 rounded-lg px-5 font-bold shadow-lg shadow-primary/15"
                onClick={() => router.push(`/practice/${encodeURIComponent(item.practiceSessionId)}`)}
              >
                  <PlayCircle className="size-4" weight="BoldDuotone" />
                  {item.status === "IN_PROGRESS"
                    ? "Vào lại buổi phỏng vấn"
                    : item.status === "COMPLETED"
                      ? `Phỏng vấn lại (${attemptsLeft} lượt)`
                      : "Tham gia phỏng vấn"}
                  <AltArrowRight className="size-4" weight="BoldDuotone" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled
                className="h-10 max-w-full rounded-lg px-4"
              >
                <DangerCircle className="size-4" weight="BoldDuotone" />
                <span className="truncate">{unavailableReason(item)}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-lg border border-white/10 bg-card/50 p-6"
        >
          <div className="flex justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-7 w-72 max-w-full rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <Skeleton className="h-12 w-24 rounded-lg" />
          </div>
          <Skeleton className="mt-6 h-20 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function UserInterviewsPage() {
  const [data, setData] = useState<UserInterviewsResponse>(EMPTY_RESPONSE);
  const [filter, setFilter] = useState<InterviewFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInterviews = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await api.get<UserInterviewsResponse>("/interviews", {
        params: { timestamp: Date.now() },
      });
      setData(response.data);
    } catch (requestError: unknown) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : "";
      setError(
        typeof message === "string"
          ? message
          : "Không thể tải danh sách phỏng vấn. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInterviews();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadInterviews]);

  const filteredInterviews = useMemo(() => {
    if (filter === "pending") {
      return data.interviews.filter(isPending);
    }
    if (filter === "inProgress") {
      return data.interviews.filter((item) => item.status === "IN_PROGRESS");
    }
    if (filter === "completed") {
      return data.interviews.filter((item) => item.status === "COMPLETED");
    }
    return data.interviews;
  }, [data.interviews, filter]);

  const stats = [
    {
      label: "Tổng lời mời",
      value: data.stats.total,
      icon: Videocamera,
      tone: "bg-blue-500/12 text-blue-400",
    },
    {
      label: "Chờ tham gia",
      value: data.stats.pending,
      icon: LetterUnread,
      tone: "bg-cyan-500/12 text-cyan-400",
    },
    {
      label: "Đang thực hiện",
      value: data.stats.inProgress,
      icon: ClockCircle,
      tone: "bg-amber-500/12 text-amber-400",
    },
    {
      label: "Đã hoàn thành",
      value: data.stats.completed,
      icon: CheckCircle,
      tone: "bg-emerald-500/12 text-emerald-400",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10 text-left">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">
            <Videocamera className="size-4" weight="BoldDuotone" />
            Không gian ứng viên
          </div>
          <h1 className="text-3xl font-extrabold tracking-normal lg:text-4xl">
            Buổi phỏng vấn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Các lời mời mà nhà tuyển dụng gửi cho bạn sẽ được cập nhật tại đây.
            Kiểm tra thời hạn và hoàn thành đúng số lượt được cấp.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void loadInterviews(true)}
          disabled={refreshing}
          className="h-10 self-start rounded-lg px-4 sm:self-auto"
        >
          <Refresh
            className={cn("size-4", refreshing && "animate-spin")}
            weight="BoldDuotone"
          />
          {refreshing ? "Đang cập nhật" : "Cập nhật"}
        </Button>
      </header>

      <section
        aria-label="Thống kê buổi phỏng vấn"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold">Danh sách lời mời</h2>
            <p className="text-xs text-muted-foreground">
              Hiển thị {filteredInterviews.length} buổi phỏng vấn
            </p>
          </div>

          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as InterviewFilter)}
          >
            <TabsList className="h-10 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-card/60 p-1">
              <TabsTrigger value="all" className="rounded-md px-3">
                Tất cả ({data.stats.total})
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-md px-3">
                Chờ tham gia ({data.stats.pending})
              </TabsTrigger>
              <TabsTrigger value="inProgress" className="rounded-md px-3">
                Đang thực hiện ({data.stats.inProgress})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-md px-3">
                Hoàn thành ({data.stats.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 px-6 text-center">
            <DangerCircle
              className="size-10 text-rose-400"
              weight="BoldDuotone"
            />
            <h3 className="mt-4 text-base font-extrabold">
              Chưa tải được danh sách
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadInterviews()}
              className="mt-5 h-10 rounded-lg"
            >
              <Refresh className="size-4" weight="BoldDuotone" />
              Thử lại
            </Button>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-card/30 px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
              <Inbox className="size-7" weight="BoldDuotone" />
            </div>
            <h3 className="mt-4 text-base font-extrabold">
              {data.interviews.length === 0
                ? "Bạn chưa có lời mời phỏng vấn"
                : "Không có buổi phỏng vấn ở trạng thái này"}
            </h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              {data.interviews.length === 0
                ? "Khi nhà tuyển dụng thêm tài khoản của bạn vào chiến dịch, lời mời sẽ tự động xuất hiện tại đây."
                : "Chọn bộ lọc khác để xem các lời mời còn lại."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview) => (
              <InterviewCard key={interview.id} item={interview} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
