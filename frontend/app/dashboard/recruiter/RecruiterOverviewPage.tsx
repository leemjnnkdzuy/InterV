"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bag as BriefcaseBusiness,
  CalendarMark as CalendarClock,
  CheckCircle as CheckCircle2,
  LetterUnread as MailWarning,
  PlayCircle,
  AddCircle as Plus,
  UsersGroupRounded as Users,
} from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  EmptyState,
  formatDashboardDate,
  MetricCard,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface RecruiterOverviewData {
  success: true;
  metrics: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalCandidates: number;
    completed: number;
    inProgress: number;
    emailFailures: number;
    completionRate: number;
  };
  funnel: Record<string, number>;
  upcomingCampaigns: Array<{
    id: string;
    title: string;
    jobTitle: string;
    startsAt?: string;
    endsAt: string;
  }>;
  recentCompletions: Array<{
    id: string;
    campaign: { title: string; jobTitle: string } | null;
    candidate: { username: string; email: string; avatar: string } | null;
    practiceSessionId: string;
    score?: number;
    completedAt?: string;
  }>;
}

const funnelOrder = [
  ["INVITED", "Đã mời"],
  ["VIEWED", "Đã xem"],
  ["IN_PROGRESS", "Đang làm"],
  ["COMPLETED", "Hoàn thành"],
] as const;

export default function RecruiterOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<RecruiterOverviewData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(
        await dashboardRequest<RecruiterOverviewData>(
          "/api/recruiter/overview"
        )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải tổng quan"
      );
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!data && !error) {
    return <DashboardLoading label="Đang tổng hợp hoạt động tuyển dụng" />;
  }
  if (error || !data) {
    return <DashboardError message={error} onRetry={() => void load()} />;
  }
  const funnelMax = Math.max(
    1,
    ...funnelOrder.map(([key]) => data.funnel[key] || 0)
  );

  return (
    <>
      <DashboardPageHeader
        title="Tổng quan tuyển dụng"
        description="Tiến độ chiến dịch, chuyển đổi ứng viên và kết quả phỏng vấn mới nhất."
        actions={
          <Button
            type="button"
            onClick={() => router.push("/recruiter/interviews/new")}
          >
            <Plus className="size-4" />
            Tạo cuộc phỏng vấn
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Chiến dịch đang mở"
          value={data.metrics.activeCampaigns}
          detail={`${data.metrics.totalCampaigns} chiến dịch`}
          icon={BriefcaseBusiness}
          tone="lime"
        />
        <MetricCard
          label="Tổng ứng viên"
          value={data.metrics.totalCandidates}
          icon={Users}
          tone="cyan"
        />
        <MetricCard
          label="Đang phỏng vấn"
          value={data.metrics.inProgress}
          icon={PlayCircle}
          tone="violet"
        />
        <MetricCard
          label="Đã hoàn thành"
          value={data.metrics.completed}
          icon={CheckCircle2}
          tone="lime"
        />
        <MetricCard
          label="Tỷ lệ hoàn thành"
          value={`${data.metrics.completionRate}%`}
          icon={CalendarClock}
          tone="amber"
        />
        <MetricCard
          label="Email cần xử lý"
          value={data.metrics.emailFailures}
          icon={MailWarning}
          tone={data.metrics.emailFailures > 0 ? "rose" : "neutral"}
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold">Phễu ứng viên</h3>
          </div>
          <div className="space-y-4 p-4">
            {funnelOrder.map(([key, label]) => {
              const count = data.funnel[key] || 0;
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">
                      {label}
                    </span>
                    <span className="font-extrabold text-foreground">
                      {count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(count / funnelMax) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold">Sắp đến hạn</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/recruiter/schedule")}
            >
              Xem lịch
            </Button>
          </div>
          {data.upcomingCampaigns.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Không có chiến dịch sắp đến hạn" />
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.upcomingCampaigns.map((campaign) => (
                <button
                  type="button"
                  key={campaign.id}
                  onClick={() =>
                    router.push(`/recruiter/interviews/${campaign.id}`)
                  }
                  className="block w-full px-4 py-3 text-left hover:bg-muted/30"
                >
                  <p className="truncate text-sm font-bold text-foreground">
                    {campaign.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {campaign.jobTitle}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Hạn {formatDashboardDate(campaign.endsAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="text-sm font-extrabold">Kết quả mới nhất</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/recruiter/history")}
          >
            Xem tất cả
          </Button>
        </div>
        {data.recentCompletions.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Chưa có ứng viên hoàn thành" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Ứng viên</th>
                  <th className="px-4 py-3 font-bold">Vị trí</th>
                  <th className="px-4 py-3 font-bold">Điểm</th>
                  <th className="px-4 py-3 text-right font-bold">Hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.recentCompletions.map((completion) => (
                  <tr key={completion.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold">
                        {completion.candidate?.username || "Không xác định"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completion.candidate?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">
                        {completion.campaign?.jobTitle || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completion.campaign?.title}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value="COMPLETED"
                        label={`${Math.round(completion.score || 0)}/100`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {formatDashboardDate(completion.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
