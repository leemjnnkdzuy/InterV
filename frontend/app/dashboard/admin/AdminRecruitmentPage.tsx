"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bag as BriefcaseBusiness,
  CheckCircle as CheckCircle2,
  LetterUnread as MailWarning,
  PlayCircle,
  Refresh as RefreshCw,
  UsersGroupRounded as Users,
} from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  DashboardSelect,
  formatDashboardDate,
  MetricCard,
  PaginationControls,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface RecruitmentResponse {
  success: true;
  campaigns: Array<{
    id: string;
    title: string;
    jobTitle: string;
    industry: string;
    status: string;
    startsAt?: string;
    endsAt: string;
    createdAt: string;
    recruiter: { username: string; email: string } | null;
    invitations: {
      total: number;
      completed: number;
      inProgress: number;
      emailFailures: number;
    };
  }>;
  counts: Record<string, number>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Đang mở",
  CLOSED: "Đã đóng",
  ARCHIVED: "Lưu trữ",
  DRAFT: "Bản nháp",
};

export default function AdminRecruitmentPage() {
  const [data, setData] = useState<RecruitmentResponse | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const endpoint = useMemo(
    () =>
      `/api/admin/recruitment?${new URLSearchParams({
        page: String(page),
        limit: "20",
        status,
      }).toString()}`,
    [page, status]
  );
  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<RecruitmentResponse>(endpoint));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu"
      );
    }
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const invitationTotals =
    data?.campaigns.reduce(
      (total, campaign) => ({
        total: total.total + campaign.invitations.total,
        completed: total.completed + campaign.invitations.completed,
        inProgress: total.inProgress + campaign.invitations.inProgress,
        failures: total.failures + campaign.invitations.emailFailures,
      }),
      { total: 0, completed: 0, inProgress: 0, failures: 0 }
    ) || { total: 0, completed: 0, inProgress: 0, failures: 0 };

  return (
    <>
      <DashboardPageHeader
        title="Giám sát hoạt động tuyển dụng"
        description="Theo dõi chiến dịch, tiến độ ứng viên và lỗi gửi thư trên toàn hệ thống."
        actions={
          <>
            <DashboardSelect
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              ariaLabel="Lọc trạng thái chiến dịch"
              triggerClassName="h-9"
              options={[
                { value: "all", label: "Mọi trạng thái" },
                { value: "ACTIVE", label: "Đang mở" },
                { value: "CLOSED", label: "Đã đóng" },
                { value: "ARCHIVED", label: "Lưu trữ" },
                { value: "DRAFT", label: "Bản nháp" },
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              Làm mới
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Tổng chiến dịch"
          value={data?.pagination.total || 0}
          detail={`${data?.counts.ACTIVE || 0} đang mở`}
          icon={BriefcaseBusiness}
          tone="lime"
        />
        <MetricCard
          label="Lời mời trên trang"
          value={invitationTotals.total}
          icon={Users}
          tone="cyan"
        />
        <MetricCard
          label="Đang phỏng vấn"
          value={invitationTotals.inProgress}
          icon={PlayCircle}
          tone="violet"
        />
        <MetricCard
          label="Đã hoàn thành"
          value={invitationTotals.completed}
          icon={CheckCircle2}
          tone="lime"
        />
        <MetricCard
          label="Email lỗi"
          value={invitationTotals.failures}
          icon={MailWarning}
          tone={invitationTotals.failures > 0 ? "rose" : "neutral"}
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-border/70 bg-card">
        {!data && !error ? (
          <DashboardLoading label="Đang tải chiến dịch tuyển dụng" />
        ) : error ? (
          <DashboardError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Chiến dịch</th>
                    <th className="px-4 py-3 font-bold">Nhà tuyển dụng</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 text-center font-bold">Ứng viên</th>
                    <th className="px-4 py-3 text-center font-bold">Tiến độ</th>
                    <th className="px-4 py-3 font-bold">Hạn hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.campaigns.map((campaign) => {
                    const completion =
                      campaign.invitations.total > 0
                        ? Math.round(
                            (campaign.invitations.completed /
                              campaign.invitations.total) *
                              100
                          )
                        : 0;
                    return (
                      <tr key={campaign.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="max-w-72 truncate text-sm font-bold text-foreground">
                            {campaign.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {campaign.jobTitle} · {campaign.industry}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">
                            {campaign.recruiter?.username || "Không xác định"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.recruiter?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={campaign.status}
                            label={
                              statusLabels[campaign.status] || campaign.status
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-extrabold">
                          {campaign.invitations.total}
                        </td>
                        <td className="px-4 py-3">
                          <div className="mx-auto w-36">
                            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                              <span>{campaign.invitations.completed} xong</span>
                              <span>{completion}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            {campaign.invitations.emailFailures > 0 && (
                              <p className="mt-1 text-[10px] font-semibold text-destructive">
                                {campaign.invitations.emailFailures} email lỗi
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDashboardDate(campaign.endsAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data && (
              <PaginationControls
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                total={data.pagination.total}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
