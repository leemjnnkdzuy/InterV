"use client";

import type { ComponentType, ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/Utils";

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-extrabold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "lime",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "lime" | "cyan" | "amber" | "rose" | "violet" | "neutral";
}) {
  const tones = {
    lime: "bg-lime-500/12 text-lime-600 dark:text-lime-400",
    cyan: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <article className="min-w-0 rounded-lg border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            tones[tone]
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      {detail && (
        <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
      )}
    </article>
  );
}

const statusStyles: Record<string, string> = {
  admin: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  recruiter:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  user: "border-border bg-muted text-muted-foreground",
  ACTIVE:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  COMPLETED:
    "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-400",
  IN_PROGRESS:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  VIEWED:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  INVITED:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  SENT: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  SENDING:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  FAILED:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  CLOSED: "border-border bg-muted text-muted-foreground",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
  DRAFT:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  EXPIRED:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  CANCELLED:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold",
        statusStyles[value] || statusStyles.user
      )}
    >
      {label || value}
    </span>
  );
}

export function DashboardLoading({ label = "Đang tải dữ liệu" }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-border/70">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-destructive/40 px-5 text-center">
      <p className="text-sm font-semibold text-destructive">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-4"
      >
        <RefreshCw className="size-4" />
        Tải lại
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 px-6 text-center">
      <Inbox className="size-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-3 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        {total.toLocaleString("vi-VN")} bản ghi
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Trang trước"
          title="Trang trước"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-8"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-24 text-center text-xs font-semibold text-foreground">
          Trang {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Trang sau"
          title="Trang sau"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-8"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function formatDashboardDate(
  value: string | Date | null | undefined,
  includeTime = true
) {
  if (!value) return "Chưa có";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}
