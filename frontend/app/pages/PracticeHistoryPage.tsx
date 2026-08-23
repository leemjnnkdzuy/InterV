"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AltArrowRight,
  CalendarDate,
  ClockCircle,
  DangerCircle,
  Inbox,
  MedalStar,
  Refresh,
  Suitcase,
  UserSpeak,
} from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/app/lib/Utils";
import { practiceService } from "@/app/services";
import type {
  PracticeHistoryItem,
  PracticeHistoryResponse,
  PracticeHistorySource,
  PracticeHistoryStatus,
} from "@/app/types";

type HistoryFilter = PracticeHistorySource | "all";

const EMPTY_HISTORY: PracticeHistoryResponse = {
  success: true,
  items: [],
  stats: { total: 0, practice: 0, recruitment: 0, completed: 0 },
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

const STATUS_META: Record<
  PracticeHistoryStatus,
  { label: string; className: string }
> = {
  STARTED: {
    label: "Đang chuẩn bị",
    className: "bg-blue-500/10 text-blue-400",
  },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    className: "bg-amber-500/10 text-amber-400",
  },
  EVALUATING: {
    label: "Đang chấm điểm",
    className: "bg-violet-500/10 text-violet-400",
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  FAILED: {
    label: "Không hoàn thành",
    className: "bg-rose-500/10 text-rose-400",
  },
  REFUNDED: {
    label: "Đã hoàn tín dụng",
    className: "bg-zinc-500/10 text-zinc-400",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function HistoryRow({ item }: { item: PracticeHistoryItem }) {
  const router = useRouter();
  const status = STATUS_META[item.status];
  const completed = item.status === "COMPLETED";

  return (
    <article className="grid gap-4 px-4 py-5 transition-colors hover:bg-muted/20 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_170px_145px_90px_130px] lg:items-center lg:gap-5">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase",
              item.source === "recruitment"
                ? "bg-cyan-500/10 text-cyan-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {item.source === "recruitment" ? (
              <Suitcase className="size-3.5" weight="BoldDuotone" />
            ) : (
              <UserSpeak className="size-3.5" weight="BoldDuotone" />
            )}
            {item.source === "recruitment"
              ? "Phỏng vấn tuyển dụng"
              : "Luyện tập cá nhân"}
          </span>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 text-[10px] font-bold",
              status.className
            )}
          >
            {status.label}
          </span>
        </div>

        <h2 className="truncate text-base font-extrabold text-foreground">
          {item.jobTitle || item.title}
        </h2>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.source === "recruitment"
            ? [item.campaignTitle, item.recruiterName]
                .filter(Boolean)
                .join(" · ") || item.title
            : [item.industry, item.difficulty].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground lg:block">
        <CalendarDate className="size-4 shrink-0 text-emerald-400 lg:mb-1" weight="BoldDuotone" />
        <span className="lg:block">{formatDate(item.completedAt || item.startedAt)}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground lg:block">
        <ClockCircle className="size-4 shrink-0 text-amber-400 lg:mb-1" weight="BoldDuotone" />
        <span className="lg:block">
          {item.duration} · {item.answeredCount}/{item.questionCount} câu
        </span>
      </div>

      <div className="flex min-w-0 items-center">
        {completed ? (
          <div className="flex items-center gap-1.5 whitespace-nowrap font-extrabold text-primary">
            <MedalStar className="size-5 shrink-0" weight="BoldDuotone" />
            <span>{item.score ?? 0}/100</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex min-w-0 items-center">
        {completed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full shrink-0 rounded-lg"
            onClick={() =>
              router.push(
                `/practice/${encodeURIComponent(item.sessionId)}/analysis?runId=${encodeURIComponent(item.id)}`
              )
            }
          >
            Xem kết quả
            <AltArrowRight className="size-4" weight="BoldDuotone" />
          </Button>
        ) : (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            Chưa có kết quả
          </span>
        )}
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-border/50">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="flex items-center gap-5 px-6 py-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-28 sm:block" />
          <Skeleton className="h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

export default function PracticeHistoryPage() {
  const [data, setData] = useState<PracticeHistoryResponse>(EMPTY_HISTORY);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await practiceService.getHistory(page, filter, 20);
      if (!response.success) {
        throw new Error(response.message || "Không thể tải lịch sử");
      }
      setData(response);
    } catch (requestError: unknown) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : requestError instanceof Error
          ? requestError.message
          : "";
      setError(
        typeof message === "string" && message
          ? message
          : "Không thể tải lịch sử. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadHistory]);

  const changeFilter = (nextFilter: HistoryFilter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  const filters: Array<{ value: HistoryFilter; label: string; count: number }> = [
    { value: "all", label: "Tất cả", count: data.stats.total },
    { value: "practice", label: "Luyện tập", count: data.stats.practice },
    {
      value: "recruitment",
      label: "Phỏng vấn tuyển dụng",
      count: data.stats.recruitment,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10 text-left">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-normal lg:text-4xl">
            Lịch sử luyện tập
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Toàn bộ các lần luyện tập cá nhân và phỏng vấn tuyển dụng của bạn
            được lưu theo từng lượt tại đây.
          </p>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border/50 py-4 text-sm">
        <span>
          <strong className="text-xl text-foreground">{data.stats.total}</strong>{" "}
          <span className="text-muted-foreground">tổng lượt</span>
        </span>
        <span>
          <strong className="text-xl text-emerald-400">
            {data.stats.completed}
          </strong>{" "}
          <span className="text-muted-foreground">đã hoàn thành</span>
        </span>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeFilter(item.value)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                filter === item.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-border/60 bg-card/50 backdrop-blur-md">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <DangerCircle className="size-10 text-rose-400" weight="BoldDuotone" />
              <h2 className="mt-4 font-extrabold">Chưa tải được lịch sử</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadHistory()}
                className="mt-5 rounded-lg"
              >
                <Refresh className="size-4" weight="BoldDuotone" />
                Thử lại
              </Button>
            </div>
          ) : data.items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <Inbox className="size-12 text-muted-foreground" weight="BoldDuotone" />
              <h2 className="mt-4 font-extrabold">Chưa có lịch sử</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Sau khi bạn bắt đầu luyện tập hoặc tham gia phỏng vấn tuyển dụng,
                từng lượt thực hiện sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.items.map((item) => (
                <HistoryRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {!loading && !error && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Trang {data.pagination.page}/{data.pagination.totalPages} ·{" "}
              {data.pagination.total} lượt
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg"
              >
                Trang trước
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() =>
                  setPage((value) =>
                    Math.min(data.pagination.totalPages, value + 1)
                  )
                }
                className="rounded-lg"
              >
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
