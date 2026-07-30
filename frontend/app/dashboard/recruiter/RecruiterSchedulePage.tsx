"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDate as CalendarDays,
  AltArrowLeft as ChevronLeft,
  AltArrowRight as ChevronRight,
  ClockSquare as Clock3,
  Flag,
} from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  EmptyState,
  formatDashboardDate,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";
import { cn } from "@/app/lib/Utils";

interface ScheduleEvent {
  id: string;
  type: "START" | "DEADLINE";
  at: string;
  campaignId: string;
  title: string;
  jobTitle: string;
  status: string;
  candidates: number;
  completed: number;
  inProgress: number;
}

interface ScheduleResponse {
  success: true;
  range: { from: string; to: string };
  events: ScheduleEvent[];
}

const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export default function RecruiterSchedulePage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState("");
  const days = useMemo(() => monthGrid(month), [month]);

  const load = useCallback(async () => {
    setError("");
    const from = new Date(days[0]);
    from.setHours(0, 0, 0, 0);
    const to = new Date(days[days.length - 1]);
    to.setHours(23, 59, 59, 999);
    try {
      setData(
        await dashboardRequest<ScheduleResponse>(
          `/api/recruiter/schedule?from=${encodeURIComponent(
            from.toISOString()
          )}&to=${encodeURIComponent(to.toISOString())}`
        )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải lịch tuyển dụng"
      );
    }
  }, [days]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of data?.events || []) {
      const key = dateKey(new Date(event.at));
      map.set(key, [...(map.get(key) || []), event]);
    }
    for (const events of map.values()) {
      events.sort(
        (left, right) =>
          new Date(left.at).getTime() - new Date(right.at).getTime()
      );
    }
    return map;
  }, [data]);

  const selectedEvents = eventsByDate.get(dateKey(selectedDate)) || [];
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(month);

  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(next);
  };

  return (
    <>
      <DashboardPageHeader
        eyebrow="Recruitment Calendar"
        title="Lịch tuyển dụng"
        description="Mốc mở và hạn hoàn thành của các chiến dịch trong cùng một lịch."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const current = new Date();
              setMonth(
                new Date(current.getFullYear(), current.getMonth(), 1)
              );
              setSelectedDate(current);
            }}
          >
            <CalendarDays className="size-4" />
            Hôm nay
          </Button>
        }
      />

      {!data && !error ? (
        <DashboardLoading label="Đang tải lịch tuyển dụng" />
      ) : error ? (
        <DashboardError message={error} onRetry={() => void load()} />
      ) : (
        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
            <div className="flex items-center justify-between border-b border-border/70 px-3 py-3 sm:px-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Tháng trước"
                aria-label="Tháng trước"
                onClick={() => changeMonth(-1)}
                className="size-8"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h3 className="text-sm font-extrabold capitalize">{monthLabel}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Tháng sau"
                aria-label="Tháng sau"
                onClick={() => changeMonth(1)}
                className="size-8"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 border-b border-border/70 bg-muted/40">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-[11px] font-bold uppercase text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((day) => {
                    const key = dateKey(day);
                    const events = eventsByDate.get(key) || [];
                    const inMonth = day.getMonth() === month.getMonth();
                    const isToday = key === dateKey(today);
                    const selected = key === dateKey(selectedDate);
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "min-h-32 border-b border-r border-border/60 p-2 text-left align-top hover:bg-muted/30",
                          !inMonth && "bg-muted/20 text-muted-foreground",
                          selected && "bg-primary/5 ring-1 ring-inset ring-primary/40"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-md text-xs font-bold",
                            isToday &&
                              "bg-primary text-primary-foreground",
                            !isToday && selected && "text-primary"
                          )}
                        >
                          {day.getDate()}
                        </span>
                        <span className="mt-2 block space-y-1">
                          {events.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={cn(
                                "block truncate rounded-sm border-l-2 px-1.5 py-1 text-[10px] font-semibold",
                                event.type === "START"
                                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                                  : "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              )}
                            >
                              {event.type === "START" ? "Mở" : "Hạn"} ·{" "}
                              {event.jobTitle}
                            </span>
                          ))}
                          {events.length > 3 && (
                            <span className="block text-[10px] font-semibold text-muted-foreground">
                              +{events.length - 3} mốc khác
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-border/70 bg-card">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-extrabold">
                {new Intl.DateTimeFormat("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(selectedDate)}
              </h3>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Không có mốc tuyển dụng" />
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {selectedEvents.map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    onClick={() =>
                      router.push(`/recruiter/interviews/${event.campaignId}`)
                    }
                    className="block w-full px-4 py-3 text-left hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md",
                          event.type === "START"
                            ? "bg-cyan-500/10 text-cyan-600"
                            : "bg-amber-500/10 text-amber-600"
                        )}
                      >
                        {event.type === "START" ? (
                          <Clock3 className="size-4" />
                        ) : (
                          <Flag className="size-4" />
                        )}
                      </span>
                      <StatusBadge
                        value={event.status}
                        label={event.type === "START" ? "Bắt đầu" : "Hạn cuối"}
                      />
                    </div>
                    <p className="mt-3 text-sm font-bold">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {event.jobTitle}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatDashboardDate(event.at)} · {event.completed}/
                      {event.candidates} hoàn thành
                    </p>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </section>
      )}
    </>
  );
}
