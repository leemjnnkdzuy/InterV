"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lock,
  Magnifier as Search,
  Refresh as RefreshCw,
  ShieldCheck,
  LockUnlocked as Unlock,
  User,
} from "@solar-icons/react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useAuthContext } from "@/app/contexts/AuthContext";
import type { AppRole } from "@/app/types";

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: AppRole;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  success: true;
  users: ManagedUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: Partial<Record<AppRole, number>>;
}

type PendingAction =
  | { kind: "role"; user: ManagedUser; role: AppRole }
  | { kind: "status"; user: ManagedUser; isActive: boolean };

const roleLabels: Record<AppRole, string> = {
  user: "Ứng viên",
  recruiter: "Nhà tuyển dụng",
  admin: "Quản trị viên",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthContext();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [mutating, setMutating] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      role,
      status,
    });
    if (query.trim()) params.set("q", query.trim());
    return `/api/admin/users?${params.toString()}`;
  }, [page, query, role, status]);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await dashboardRequest<UsersResponse>(endpoint));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải người dùng"
      );
    }
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  const confirmMutation = async () => {
    if (!pending) return;
    setMutating(true);
    try {
      if (pending.kind === "role") {
        await dashboardRequest(
          `/api/admin/users/${pending.user.id}/role`,
          {
            method: "PATCH",
            body: JSON.stringify({ role: pending.role }),
          }
        );
        toast.success(
          `Đã cấp vai trò ${roleLabels[pending.role]} cho ${pending.user.username}`
        );
      } else {
        await dashboardRequest(
          `/api/admin/users/${pending.user.id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ isActive: pending.isActive }),
          }
        );
        toast.success(
          pending.isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản"
        );
      }
      setPending(null);
      await load();
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Không thể cập nhật người dùng"
      );
    } finally {
      setMutating(false);
    }
  };

  return (
    <>
      <DashboardPageHeader
        title="Người dùng & phân quyền"
        description="Quản lý trạng thái tài khoản và cấp quyền nhà tuyển dụng. Mọi thay đổi quyền đều thu hồi phiên đăng nhập hiện tại."
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

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        {(["user", "recruiter", "admin"] as AppRole[]).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => {
              setRole(item);
              setPage(1);
            }}
            className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 text-left hover:border-primary/50"
          >
            <span>
              <span className="block text-xs font-semibold text-muted-foreground">
                {roleLabels[item]}
              </span>
              <span className="mt-1 block text-xl font-extrabold text-foreground">
                {(data?.counts[item] || 0).toLocaleString("vi-VN")}
              </span>
            </span>
            <StatusBadge value={item} label={roleLabels[item]} />
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo username hoặc email"
              aria-label="Tìm người dùng"
              className="h-10 pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <DashboardSelect
              value={role}
              onValueChange={(value) => {
                setRole(value);
                setPage(1);
              }}
              ariaLabel="Lọc vai trò"
              options={[
                { value: "all", label: "Mọi vai trò" },
                { value: "user", label: "Ứng viên" },
                { value: "recruiter", label: "Nhà tuyển dụng" },
                { value: "admin", label: "Quản trị viên" },
              ]}
            />
            <DashboardSelect
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              ariaLabel="Lọc trạng thái"
              options={[
                { value: "all", label: "Mọi trạng thái" },
                { value: "active", label: "Đang hoạt động" },
                { value: "inactive", label: "Đã khóa" },
              ]}
            />
          </div>
        </div>

        {!data && !error ? (
          <DashboardLoading label="Đang tải danh sách người dùng" />
        ) : error ? (
          <DashboardError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Người dùng</th>
                    <th className="px-4 py-3 font-bold">Vai trò</th>
                    <th className="px-4 py-3 font-bold">Xác minh</th>
                    <th className="px-4 py-3 font-bold">Credits</th>
                    <th className="px-4 py-3 font-bold">Ngày tạo</th>
                    <th className="px-4 py-3 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.users.map((managedUser) => {
                    const isSelf = currentUser?.id === managedUser.id;
                    return (
                      <tr key={managedUser.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-xs font-extrabold">
                              {managedUser.avatar ? (
                                <Image
                                  src={managedUser.avatar}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="size-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                managedUser.username
                                  .slice(0, 1)
                                  .toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                                {managedUser.username}
                                {isSelf && (
                                  <ShieldCheck className="size-3.5 text-primary" />
                                )}
                              </p>
                              <p className="max-w-64 truncate text-xs text-muted-foreground">
                                {managedUser.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <DashboardSelect
                            value={managedUser.role}
                            disabled={isSelf}
                            onValueChange={(value) =>
                              setPending({
                                kind: "role",
                                user: managedUser,
                                role: value as AppRole,
                              })
                            }
                            ariaLabel={`Vai trò của ${managedUser.username}`}
                            options={[
                              { value: "user", label: "Ứng viên" },
                              { value: "recruiter", label: "Nhà tuyển dụng" },
                              { value: "admin", label: "Quản trị viên" },
                            ]}
                            triggerClassName="h-9 min-w-36 text-xs disabled:opacity-60"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={
                              managedUser.isVerified ? "COMPLETED" : "PENDING"
                            }
                            label={
                              managedUser.isVerified ? "Đã xác minh" : "Chờ xác minh"
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground">
                          {managedUser.credits.toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDashboardDate(managedUser.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() =>
                              setPending({
                                kind: "status",
                                user: managedUser,
                                isActive: !managedUser.isActive,
                              })
                            }
                            className={
                              managedUser.isActive
                                ? "text-destructive hover:text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {managedUser.isActive ? (
                              <Lock className="size-4" />
                            ) : (
                              <Unlock className="size-4" />
                            )}
                            {managedUser.isActive ? "Khóa" : "Mở khóa"}
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

      <Dialog open={Boolean(pending)} onOpenChange={() => !mutating && setPending(null)}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <User className="size-5" />
            </div>
            <DialogTitle className="text-base font-extrabold">
              {pending?.kind === "role"
                ? "Xác nhận thay đổi vai trò"
                : pending?.isActive
                  ? "Mở khóa tài khoản"
                  : "Khóa tài khoản"}
            </DialogTitle>
            <DialogDescription>
              {pending?.kind === "role"
                ? `Cấp vai trò ${roleLabels[pending.role]} cho ${pending.user.username}. Người dùng sẽ phải đăng nhập lại.`
                : pending?.isActive
                  ? `Khôi phục quyền truy cập cho ${pending.user.username}.`
                  : `Thu hồi mọi phiên đăng nhập và chặn quyền truy cập của ${pending?.user.username}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutating}
              onClick={() => setPending(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={mutating}
              onClick={() => void confirmMutation()}
            >
              {mutating ? "Đang cập nhật..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
