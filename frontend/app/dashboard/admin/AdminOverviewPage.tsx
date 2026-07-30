"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChartSquare as Activity,
  Bag as BriefcaseBusiness,
  CheckCircle as CheckCircle2,
  ShieldCheck,
  UserCheck,
  UsersGroupRounded as Users,
} from "@solar-icons/react";

import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  formatDashboardDate,
  MetricCard,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface AdminOverviewData {
  success: true;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    regularUsers: number;
    recruiters: number;
    admins: number;
    activeCampaigns: number;
    totalCampaigns: number;
    totalInvitations: number;
    completedInvitations: number;
    completionRate: number;
    completedRuns: number;
  };
  signupTrend: Array<{ date: string; count: number }>;
  recentUsers: Array<{
    id: string;
    username: string;
    email: string;
    role: "user" | "recruiter" | "admin";
    isActive: boolean;
    createdAt: string;
  }>;
  recentAudits: Array<{
    id: string;
    action: string;
    targetType: string;
    summary: string;
    actor: string;
    createdAt: string;
  }>;
}

const roleLabels = {
  user: "Ứng viên",
  recruiter: "Nhà tuyển dụng",
  admin: "Quản trị viên",
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<AdminOverviewData>("/api/admin/overview"));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu"
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!data && !error) {
    return <DashboardLoading label="Đang tổng hợp dữ liệu hệ thống" />;
  }
  if (error || !data) {
    return <DashboardError message={error} onRetry={() => void load()} />;
  }

  const maxSignup = Math.max(
    1,
    ...data.signupTrend.map((item) => item.count)
  );

  return (
    <>
      <DashboardPageHeader
        eyebrow="Control Center"
        title="Tổng quan hệ thống"
        description="Tình trạng người dùng, hoạt động tuyển dụng và sự kiện quản trị gần nhất."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Tổng người dùng"
          value={data.metrics.totalUsers.toLocaleString("vi-VN")}
          detail={`${data.metrics.activeUsers.toLocaleString("vi-VN")} đang hoạt động`}
          icon={Users}
          tone="lime"
        />
        <MetricCard
          label="Nhà tuyển dụng"
          value={data.metrics.recruiters.toLocaleString("vi-VN")}
          detail={`${data.metrics.admins} quản trị viên`}
          icon={UserCheck}
          tone="cyan"
        />
        <MetricCard
          label="Chiến dịch đang mở"
          value={data.metrics.activeCampaigns.toLocaleString("vi-VN")}
          detail={`${data.metrics.totalCampaigns} chiến dịch toàn hệ thống`}
          icon={BriefcaseBusiness}
          tone="amber"
        />
        <MetricCard
          label="Lời mời phỏng vấn"
          value={data.metrics.totalInvitations.toLocaleString("vi-VN")}
          detail={`${data.metrics.completedInvitations} đã hoàn thành`}
          icon={Activity}
          tone="violet"
        />
        <MetricCard
          label="Tỷ lệ hoàn thành"
          value={`${data.metrics.completionRate}%`}
          detail="Theo tổng số lời mời"
          icon={CheckCircle2}
          tone="lime"
        />
        <MetricCard
          label="Tài khoản bị khóa"
          value={data.metrics.inactiveUsers.toLocaleString("vi-VN")}
          detail={`${data.metrics.completedRuns} lượt AI đã chấm`}
          icon={ShieldCheck}
          tone={data.metrics.inactiveUsers > 0 ? "rose" : "neutral"}
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold text-foreground">
              Tài khoản mới trong 7 ngày
            </h3>
          </div>
          <div className="grid h-64 grid-cols-7 items-end gap-2 px-4 pb-4 pt-8 sm:gap-4">
            {data.signupTrend.map((item) => {
              const date = new Date(`${item.date}T00:00:00`);
              return (
                <div
                  key={item.date}
                  className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-bold text-foreground">
                    {item.count}
                  </span>
                  <div className="flex h-40 w-full items-end justify-center rounded-sm bg-muted/60">
                    <div
                      className="w-[55%] min-w-3 rounded-t-sm bg-primary transition-[height]"
                      style={{
                        height: `${Math.max(
                          item.count > 0 ? 8 : 2,
                          (item.count / maxSignup) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {new Intl.DateTimeFormat("vi-VN", {
                      weekday: "short",
                    }).format(date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold text-foreground">
              Nhật ký gần nhất
            </h3>
          </div>
          <div className="divide-y divide-border/60">
            {data.recentAudits.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Chưa có thao tác quản trị
              </p>
            ) : (
              data.recentAudits.map((audit) => (
                <div key={audit.id} className="flex gap-3 px-4 py-3">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">
                      {audit.summary}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {audit.actor} · {formatDashboardDate(audit.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="border-b border-border/70 px-4 py-3">
          <h3 className="text-sm font-extrabold text-foreground">
            Người dùng mới
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Tài khoản</th>
                <th className="px-4 py-3 font-bold">Vai trò</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-bold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.recentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-foreground">
                      {user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      value={user.role}
                      label={roleLabels[user.role]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      value={user.isActive ? "ACTIVE" : "CANCELLED"}
                      label={user.isActive ? "Hoạt động" : "Đã khóa"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatDashboardDate(user.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
