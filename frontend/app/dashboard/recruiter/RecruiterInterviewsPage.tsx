"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bag as BriefcaseBusiness,
  CheckCircle as CheckCircle2,
  LetterUnread as MailWarning,
  AddCircle as Plus,
  Refresh as RefreshCw,
  UsersGroupRounded as Users,
} from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  DashboardSelect,
  EmptyState,
  formatDashboardDate,
  MetricCard,
  PaginationControls,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface CampaignListResponse {
  success: true;
  campaigns: Array<{
    id: string;
    title: string;
    jobTitle: string;
    department?: string;
    industry: string;
    status: string;
    startsAt?: string;
    endsAt: string;
    questionCount: number;
    difficulty: string;
    createdAt: string;
    invitations: {
      total: number;
      completed: number;
      inProgress: number;
      invited: number;
      emailFailures: number;
    };
  }>;
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

export default function RecruiterInterviewsPage() {
  const router = useRouter();
  const [data, setData] = useState<CampaignListResponse | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const endpoint = useMemo(
    () =>
      `/api/recruiter/interviews?${new URLSearchParams({
        status,
        page: String(page),
        limit: "20",
      }).toString()}`,
    [page, status]
  );
  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<CampaignListResponse>(endpoint));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải cuộc phỏng vấn"
      );
    }
  }, [endpoint]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals =
    data?.campaigns.reduce(
      (current, campaign) => ({
        candidates: current.candidates + campaign.invitations.total,
        completed: current.completed + campaign.invitations.completed,
        failures: current.failures + campaign.invitations.emailFailures,
      }),
      { candidates: 0, completed: 0, failures: 0 }
    ) || { candidates: 0, completed: 0, failures: 0 };

  return (
    <>
      <DashboardPageHeader
        title="Cuộc phỏng vấn"
        description="Theo dõi tiến độ, hạn hoàn thành và tình trạng thư mời theo từng chiến dịch."
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
              size="sm"
              onClick={() => router.push("/recruiter/interviews/new")}
            >
              <Plus className="size-4" />
              Tạo mới
            </Button>
          </>
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Chiến dịch theo bộ lọc"
          value={data?.pagination.total || 0}
          icon={BriefcaseBusiness}
          tone="lime"
        />
        <MetricCard
          label="Ứng viên trên trang"
          value={totals.candidates}
          icon={Users}
          tone="cyan"
        />
        <MetricCard
          label="Đã hoàn thành"
          value={totals.completed}
          icon={CheckCircle2}
          tone="violet"
        />
        <MetricCard
          label="Email gửi lỗi"
          value={totals.failures}
          icon={MailWarning}
          tone={totals.failures > 0 ? "rose" : "neutral"}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 p-3">
          <h3 className="text-sm font-extrabold">Danh sách chiến dịch</h3>
          <DashboardSelect
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            ariaLabel="Lọc trạng thái"
            triggerClassName="h-9"
            options={[
              { value: "all", label: "Mọi trạng thái" },
              { value: "ACTIVE", label: "Đang mở" },
              { value: "CLOSED", label: "Đã đóng" },
              { value: "ARCHIVED", label: "Lưu trữ" },
              { value: "DRAFT", label: "Bản nháp" },
            ]}
          />
        </div>

        {!data && !error ? (
          <DashboardLoading label="Đang tải chiến dịch" />
        ) : error ? (
          <DashboardError message={error} onRetry={() => void load()} />
        ) : data?.campaigns.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có chiến dịch phù hợp"
              action={
                <Button
                  type="button"
                  size="sm"
                  onClick={() => router.push("/recruiter/interviews/new")}
                >
                  <Plus className="size-4" />
                  Tạo cuộc phỏng vấn
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Chiến dịch</th>
                    <th className="px-4 py-3 font-bold">Cấu hình</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 text-center font-bold">Ứng viên</th>
                    <th className="px-4 py-3 font-bold">Tiến độ</th>
                    <th className="px-4 py-3 font-bold">Hạn</th>
                    <th className="px-4 py-3 text-right font-bold">Mở</th>
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
                          <p className="max-w-72 truncate text-sm font-bold">
                            {campaign.title}
                          </p>
                          <p className="mt-0.5 max-w-72 truncate text-xs text-muted-foreground">
                            {campaign.jobTitle}
                            {campaign.department
                              ? ` · ${campaign.department}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold">
                            {campaign.difficulty} · {campaign.questionCount} câu
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {campaign.industry}
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
                          <div className="w-40">
                            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                              <span>
                                {campaign.invitations.completed} hoàn thành
                              </span>
                              <span>{completion}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            {campaign.invitations.emailFailures > 0 && (
                              <span className="mt-1 block text-[10px] font-semibold text-destructive">
                                {campaign.invitations.emailFailures} email lỗi
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDashboardDate(campaign.endsAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Mở chiến dịch"
                            aria-label={`Mở ${campaign.title}`}
                            onClick={() =>
                              router.push(
                                `/recruiter/interviews/${campaign.id}`
                              )
                            }
                            className="size-8"
                          >
                            <ArrowRight className="size-4" />
                          </Button>
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
