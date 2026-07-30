"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Magnifier as Search, Refresh as RefreshCw, ShieldCheck } from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  DashboardSelect,
  formatDashboardDate,
  PaginationControls,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface AuditLog {
  id: string;
  actor: { username: string; email: string } | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  changes: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditResponse {
  success: true;
  logs: AuditLog[];
  actions: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function actionLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "30",
    });
    if (query.trim()) params.set("q", query.trim());
    if (action) params.set("action", action);
    return `/api/admin/audit?${params.toString()}`;
  }, [action, page, query]);
  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<AuditResponse>(endpoint));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải nhật ký"
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
        eyebrow="Security Audit"
        title="Nhật ký quản trị"
        description="Dấu vết bất biến của các thay đổi quyền, trạng thái tài khoản và nghiệp vụ tuyển dụng."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
        }
      />

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
              placeholder="Tìm nội dung, loại đối tượng hoặc ID"
              aria-label="Tìm nhật ký"
              className="h-10 pl-9"
            />
          </div>
          <DashboardSelect
            value={action}
            onValueChange={(value) => {
              setAction(value);
              setPage(1);
            }}
            ariaLabel="Lọc loại hành động"
            options={[
              { value: "", label: "Mọi hành động" },
              ...(data?.actions.map((item) => ({
                value: item,
                label: actionLabel(item),
              })) || []),
            ]}
          />
        </div>

        {!data && !error ? (
          <DashboardLoading label="Đang tải nhật ký bảo mật" />
        ) : error ? (
          <DashboardError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Thời gian</th>
                    <th className="px-4 py-3 font-bold">Người thực hiện</th>
                    <th className="px-4 py-3 font-bold">Hành động</th>
                    <th className="px-4 py-3 font-bold">Nội dung</th>
                    <th className="px-4 py-3 font-bold">IP</th>
                    <th className="px-4 py-3 text-right font-bold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDashboardDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-foreground">
                          {log.actor?.username || "Hệ thống"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.actor?.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          value={log.actorRole}
                          label={actionLabel(log.action)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-96 truncate text-sm text-foreground">
                          {log.summary}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {log.targetType}
                          {log.targetId ? ` · ${log.targetId}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.ipAddress || "unknown"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                          onClick={() => setSelected(log)}
                          className="size-8"
                        >
                          <Eye className="size-4" />
                        </Button>
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

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="rounded-lg sm:max-w-xl">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle className="font-extrabold">
              {selected ? actionLabel(selected.action) : "Chi tiết nhật ký"}
            </DialogTitle>
            <DialogDescription>{selected?.summary}</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-border/70 p-3">
                <dt className="text-muted-foreground">Người thực hiện</dt>
                <dd className="mt-1 font-bold text-foreground">
                  {selected.actor?.username || "Hệ thống"}
                </dd>
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <dt className="text-muted-foreground">Thời gian</dt>
                <dd className="mt-1 font-bold text-foreground">
                  {formatDashboardDate(selected.createdAt)}
                </dd>
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <dt className="text-muted-foreground">Đối tượng</dt>
                <dd className="mt-1 break-all font-bold text-foreground">
                  {selected.targetType} · {selected.targetId || "N/A"}
                </dd>
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <dt className="text-muted-foreground">Nguồn</dt>
                <dd className="mt-1 break-all font-mono text-foreground">
                  {selected.ipAddress || "unknown"}
                </dd>
              </div>
              <div className="rounded-md border border-border/70 p-3 sm:col-span-2">
                <dt className="text-muted-foreground">Thay đổi</dt>
                <dd className="mt-2 overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-[11px] text-foreground">
                    {JSON.stringify(selected.changes, null, 2)}
                  </pre>
                </dd>
              </div>
              <div className="rounded-md border border-border/70 p-3 sm:col-span-2">
                <dt className="text-muted-foreground">User agent</dt>
                <dd className="mt-1 break-all text-foreground">
                  {selected.userAgent || "unknown"}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
