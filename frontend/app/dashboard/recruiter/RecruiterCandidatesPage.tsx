"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle as CheckCircle2,
  Clipboard,
  Magnifier as Search,
  UserCheckRounded as UserRoundCheck,
  UsersGroupRounded as Users,
} from "@solar-icons/react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
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

interface CandidatesResponse {
  success: true;
  candidates: Array<{
    invitationId: string;
    candidate: {
      id: string;
      username: string;
      email: string;
      avatar?: string;
      isActive: boolean;
    } | null;
    campaign: {
      id: string;
      title: string;
      jobTitle: string;
      status: string;
      endsAt: string;
    } | null;
    practiceSessionId: string;
    status: string;
    emailStatus: string;
    finalScore?: number;
    invitedAt: string;
    sentAt?: string;
    startedAt?: string;
    completedAt?: string;
    expiresAt: string;
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
  INVITED: "Đã mời",
  VIEWED: "Đã xem",
  IN_PROGRESS: "Đang phỏng vấn",
  COMPLETED: "Hoàn thành",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};

export default function RecruiterCandidatesPage() {
  const router = useRouter();
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      status,
    });
    if (query.trim()) params.set("q", query.trim());
    return `/api/recruiter/candidates?${params.toString()}`;
  }, [page, query, status]);
  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<CandidatesResponse>(endpoint));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải ứng viên"
      );
    }
  }, [endpoint]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  return (
    <>
      <DashboardPageHeader
        eyebrow="Candidate Pipeline"
        title="Ứng viên"
        description="Tất cả ứng viên theo từng lời mời và trạng thái trong quy trình phỏng vấn."
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tổng lời mời"
          value={data?.pagination.total || 0}
          icon={Users}
          tone="cyan"
        />
        <MetricCard
          label="Đã xem"
          value={data?.counts.VIEWED || 0}
          icon={UserRoundCheck}
          tone="violet"
        />
        <MetricCard
          label="Đang phỏng vấn"
          value={data?.counts.IN_PROGRESS || 0}
          icon={ArrowRight}
          tone="amber"
        />
        <MetricCard
          label="Hoàn thành"
          value={data?.counts.COMPLETED || 0}
          icon={CheckCircle2}
          tone="lime"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên hoặc email ứng viên"
              aria-label="Tìm ứng viên"
              className="h-10 pl-9"
            />
          </div>
          <DashboardSelect
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            ariaLabel="Lọc trạng thái ứng viên"
            options={[
              { value: "all", label: "Mọi trạng thái" },
              ...Object.entries(statusLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>

        {!data && !error ? (
          <DashboardLoading label="Đang tải danh sách ứng viên" />
        ) : error ? (
          <DashboardError message={error} onRetry={() => void load()} />
        ) : data?.candidates.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Không có ứng viên phù hợp" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Ứng viên</th>
                    <th className="px-4 py-3 font-bold">Chiến dịch</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 text-center font-bold">Điểm</th>
                    <th className="px-4 py-3 font-bold">Hạn</th>
                    <th className="px-4 py-3 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.candidates.map((item) => (
                    <tr key={item.invitationId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold">
                          {item.candidate?.username || "Không xác định"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.candidate?.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            item.campaign &&
                            router.push(
                              `/recruiter/interviews/${item.campaign.id}`
                            )
                          }
                          className="max-w-72 text-left"
                        >
                          <span className="block truncate text-sm font-semibold hover:text-primary">
                            {item.campaign?.title || "Không xác định"}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.campaign?.jobTitle}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          value={item.status}
                          label={statusLabels[item.status] || item.status}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={item.emailStatus} />
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-extrabold">
                        {item.finalScore !== undefined
                          ? Math.round(item.finalScore)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDashboardDate(item.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Sao chép liên kết"
                            aria-label="Sao chép liên kết"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                `${window.location.origin}/practice/${item.practiceSessionId}`
                              );
                              toast.success("Đã sao chép liên kết");
                            }}
                            className="size-8"
                          >
                            <Clipboard className="size-4" />
                          </Button>
                          {item.campaign && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Mở chiến dịch"
                              aria-label="Mở chiến dịch"
                              onClick={() =>
                                router.push(
                                  `/recruiter/interviews/${item.campaign?.id}`
                                )
                              }
                              className="size-8"
                            >
                              <ArrowRight className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
