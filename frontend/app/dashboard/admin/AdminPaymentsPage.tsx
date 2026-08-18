"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RoundArrowDown as ArrowDownCircle,
  RoundArrowUp as ArrowUpCircle,
  Banknote,
  Dollar as CircleDollarSign,
  DollarMinimalistic as Coins,
  Card as CreditCard,
  SquareArrowRightUp as ExternalLink,
  History,
  Refresh as RefreshCw,
  Magnifier as Search,
  UserId as UserRoundSearch,
  WalletMoney as WalletCards,
  CloseCircle as X,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
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

interface ManagedTransaction {
  id: string;
  user: { id: string; username: string; email: string } | null;
  orderCode: number;
  amount: number;
  credits: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
  providerStatus: string;
  paymentLinkId: string;
  paymentUrl?: string;
  paidAt?: string;
  cancelledAt?: string;
  lastReconciledAt?: string;
  cancellationReason?: string;
  reconciliationError?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentData {
  success: true;
  metrics: {
    transactions: number;
    paidTransactions: number;
    pendingTransactions: number;
    cancelledTransactions: number;
    revenueVnd: number;
    creditsSold: number;
    pendingVnd: number;
    conversionRate: number;
  };
  trend: Array<{
    date: string;
    revenueVnd: number;
    paid: number;
    created: number;
  }>;
  transactions: ManagedTransaction[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface CreditData {
  success: true;
  metrics: {
    entries: number;
    issuedCredits: number;
    consumedCredits: number;
    rechargeCredits: number;
    adminNetCredits: number;
    refundedCredits: number;
    totalUserBalance: number;
    users: number;
  };
  logs: Array<{
    id: string;
    user: {
      id: string;
      username: string;
      email: string;
      balance: number;
    } | null;
    credits: number;
    action: string;
    description?: string;
    referenceId?: string;
    createdAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface UserSearchData {
  success: true;
  users: Array<{
    id: string;
    username: string;
    email: string;
    credits: number;
    isActive: boolean;
  }>;
}

const actionLabels: Record<string, string> = {
  RECHARGE: "Nạp PayOS",
  AI_INTERVIEW: "Phỏng vấn AI",
  AI_INTERVIEW_REFUND: "Hoàn phỏng vấn",
  AI_JD_EXTRACT: "Phân tích JD",
  REGISTER_BONUS: "Thưởng đăng ký",
  ADMIN_ADJUST: "Admin điều chỉnh",
};

function vnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData | null>(null);
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [paymentPage, setPaymentPage] = useState(1);
  const [creditPage, setCreditPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [creditAction, setCreditAction] = useState("");
  const [creditQuery, setCreditQuery] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    kind: "reconcile" | "cancel";
    transaction: ManagedTransaction;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [mutating, setMutating] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserSearchData["users"]>([]);
  const [selectedUser, setSelectedUser] =
    useState<UserSearchData["users"][number] | null>(null);
  const [adjustCredits, setAdjustCredits] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const adjustmentKey = useRef("");

  const paymentEndpoint = useMemo(() => {
    const params = new URLSearchParams({
      days: String(days),
      page: String(paymentPage),
      limit: "20",
    });
    if (paymentStatus) params.set("status", paymentStatus);
    if (paymentQuery.trim()) params.set("q", paymentQuery.trim());
    return `/api/admin/payments?${params.toString()}`;
  }, [days, paymentPage, paymentQuery, paymentStatus]);

  const creditEndpoint = useMemo(() => {
    const params = new URLSearchParams({
      days: String(days),
      page: String(creditPage),
      limit: "20",
    });
    if (creditAction) params.set("action", creditAction);
    if (creditQuery.trim()) params.set("q", creditQuery.trim());
    return `/api/admin/credits?${params.toString()}`;
  }, [creditAction, creditPage, creditQuery, days]);

  const loadPayments = useCallback(async () => {
    setPayments(await dashboardRequest<PaymentData>(paymentEndpoint));
  }, [paymentEndpoint]);

  const loadCredits = useCallback(async () => {
    setCredits(await dashboardRequest<CreditData>(creditEndpoint));
  }, [creditEndpoint]);

  const loadAll = useCallback(async () => {
    setError("");
    try {
      await Promise.all([loadPayments(), loadCredits()]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu tài chính"
      );
    }
  }, [loadCredits, loadPayments]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadAll(),
      paymentQuery || creditQuery ? 250 : 0
    );
    return () => window.clearTimeout(timer);
  }, [creditQuery, loadAll, paymentQuery]);

  useEffect(() => {
    if (!adjustOpen || selectedUser || userQuery.trim().length < 2) {
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const result = await dashboardRequest<UserSearchData>(
          `/api/admin/users?q=${encodeURIComponent(userQuery.trim())}&limit=10`
        );
        setUserResults(result.users);
      } catch {
        setUserResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [adjustOpen, selectedUser, userQuery]);

  const executePaymentAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "cancel" && cancelReason.trim().length < 5) {
      toast.error("Nhập lý do hủy ít nhất 5 ký tự");
      return;
    }
    setMutating(true);
    try {
      const endpoint = `/api/admin/payments/${pendingAction.transaction.id}/${pendingAction.kind}`;
      await dashboardRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(
          pendingAction.kind === "cancel"
            ? { reason: cancelReason.trim() }
            : {}
        ),
      });
      toast.success(
        pendingAction.kind === "cancel"
          ? "Đã hủy giao dịch trên PayOS"
          : "Đã đối soát với PayOS"
      );
      setPendingAction(null);
      setCancelReason("");
      await Promise.all([loadPayments(), loadCredits()]);
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Không thể xử lý giao dịch"
      );
    } finally {
      setMutating(false);
    }
  };

  const submitAdjustment = async () => {
    const amount = Number(adjustCredits);
    if (
      !selectedUser ||
      !Number.isSafeInteger(amount) ||
      amount === 0 ||
      adjustReason.trim().length < 10
    ) {
      toast.error("Chọn người dùng, nhập số credit và lý do hợp lệ");
      return;
    }
    setMutating(true);
    try {
      await dashboardRequest("/api/admin/credits", {
        method: "POST",
        body: JSON.stringify({
          userId: selectedUser.id,
          credits: amount,
          reason: adjustReason.trim(),
          idempotencyKey:
            adjustmentKey.current ||
            (adjustmentKey.current = crypto.randomUUID()),
        }),
      });
      toast.success(
        `Đã điều chỉnh ${amount > 0 ? "+" : ""}${amount} credits`
      );
      setAdjustOpen(false);
      setSelectedUser(null);
      setUserQuery("");
      setAdjustCredits("");
      setAdjustReason("");
      adjustmentKey.current = "";
      await loadCredits();
    } catch (adjustError) {
      toast.error(
        adjustError instanceof Error
          ? adjustError.message
          : "Không thể điều chỉnh credit"
      );
    } finally {
      setMutating(false);
    }
  };

  if ((!payments || !credits) && !error) {
    return <DashboardLoading label="Đang tổng hợp thanh toán và credit" />;
  }
  if (error || !payments || !credits) {
    return <DashboardError message={error} onRetry={() => void loadAll()} />;
  }

  const maxRevenue = Math.max(
    1,
    ...payments.trend.map((item) => item.revenueVnd)
  );

  return (
    <>
      <DashboardPageHeader
        title="Thanh toán & credit"
        description="Đối soát PayOS, doanh thu, trạng thái giao dịch và toàn bộ biến động credit người dùng."
        actions={
          <>
            <div className="flex h-9 rounded-md border border-border bg-card p-0.5">
              {[7, 30, 90, 365].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => {
                    setDays(value);
                    setPaymentPage(1);
                    setCreditPage(1);
                  }}
                  className={`min-w-12 rounded-sm px-2 text-xs font-bold ${
                    days === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value === 365 ? "1NĂM" : `${value}N`}
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                adjustmentKey.current = crypto.randomUUID();
                setAdjustOpen(true);
              }}
            >
              <Coins className="size-4" />
              Điều chỉnh credit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Làm mới"
              aria-label="Làm mới"
              onClick={() => void loadAll()}
            >
              <RefreshCw className="size-4" />
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Doanh thu"
          value={vnd(payments.metrics.revenueVnd)}
          detail={`${payments.metrics.paidTransactions} giao dịch đã thanh toán`}
          icon={Banknote}
          tone="lime"
        />
        <MetricCard
          label="Tỷ lệ thanh toán"
          value={`${payments.metrics.conversionRate.toFixed(1)}%`}
          detail={`${payments.metrics.transactions} giao dịch được tạo`}
          icon={CircleDollarSign}
          tone="cyan"
        />
        <MetricCard
          label="Đang chờ"
          value={payments.metrics.pendingTransactions}
          detail={vnd(payments.metrics.pendingVnd)}
          icon={CreditCard}
          tone={payments.metrics.pendingTransactions > 0 ? "amber" : "neutral"}
        />
        <MetricCard
          label="Credit đã bán"
          value={payments.metrics.creditsSold.toLocaleString("vi-VN")}
          detail={`${credits.metrics.rechargeCredits.toLocaleString("vi-VN")} credit vào sổ`}
          icon={WalletCards}
          tone="violet"
        />
        <MetricCard
          label="Số dư người dùng"
          value={credits.metrics.totalUserBalance.toLocaleString("vi-VN")}
          detail={`${credits.metrics.users.toLocaleString("vi-VN")} tài khoản`}
          icon={Coins}
          tone="cyan"
        />
        <MetricCard
          label="Credit đã sử dụng"
          value={credits.metrics.consumedCredits.toLocaleString("vi-VN")}
          detail={`Admin net ${credits.metrics.adminNetCredits > 0 ? "+" : ""}${credits.metrics.adminNetCredits.toLocaleString("vi-VN")}`}
          icon={History}
          tone="rose"
        />
      </section>

      <Tabs defaultValue="payments" className="mt-6">
        <TabsList variant="line" className="mb-3">
          <TabsTrigger value="payments">
            <CreditCard className="size-4" />
            Giao dịch PayOS
          </TabsTrigger>
          <TabsTrigger value="credits">
            <Coins className="size-4" />
            Sổ credit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-extrabold text-foreground">
                Doanh thu theo ngày
              </h3>
            </div>
            {payments.trend.length === 0 ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                Chưa có giao dịch trong kỳ
              </p>
            ) : (
              <div className="flex h-56 items-end gap-2 overflow-x-auto px-4 pb-4 pt-8">
                {payments.trend.map((item) => (
                  <div
                    key={item.date}
                    className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2"
                    title={`${vnd(item.revenueVnd)} · ${item.paid}/${item.created} thành công`}
                  >
                    <span className="text-[10px] font-bold text-foreground">
                      {item.paid}/{item.created}
                    </span>
                    <div className="flex h-32 w-full items-end justify-center rounded-sm bg-muted/60">
                      <div
                        className="w-[58%] min-w-3 rounded-t-sm bg-primary"
                        style={{
                          height: `${Math.max(
                            3,
                            (item.revenueVnd / maxRevenue) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {item.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
            <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={paymentQuery}
                  onChange={(event) => {
                    setPaymentQuery(event.target.value);
                    setPaymentPage(1);
                  }}
                  placeholder="Tìm order code, username hoặc email"
                  aria-label="Tìm giao dịch"
                  className="h-10 pl-9"
                />
              </div>
              <DashboardSelect
                value={paymentStatus}
                onValueChange={(value) => {
                  setPaymentStatus(value);
                  setPaymentPage(1);
                }}
                ariaLabel="Lọc trạng thái thanh toán"
                options={[
                  { value: "", label: "Mọi trạng thái" },
                  { value: "PENDING", label: "Đang chờ" },
                  { value: "PAID", label: "Đã thanh toán" },
                  { value: "CANCELLED", label: "Đã hủy" },
                  { value: "EXPIRED", label: "Đã hết hạn" },
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Giao dịch</th>
                    <th className="px-4 py-3 font-bold">Người dùng</th>
                    <th className="px-4 py-3 text-right font-bold">Số tiền</th>
                    <th className="px-4 py-3 text-right font-bold">Credits</th>
                    <th className="px-4 py-3 font-bold">Nội bộ</th>
                    <th className="px-4 py-3 font-bold">PayOS</th>
                    <th className="px-4 py-3 font-bold">Đối soát</th>
                    <th className="px-4 py-3 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-xs font-extrabold text-foreground">
                          #{transaction.orderCode}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDashboardDate(transaction.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-foreground">
                          {transaction.user?.username || "Không xác định"}
                        </p>
                        <p className="max-w-48 truncate text-[11px] text-muted-foreground">
                          {transaction.user?.email || transaction.paymentLinkId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                        {vnd(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                        {transaction.credits.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          value={transaction.status}
                          label={
                            transaction.status === "PAID"
                              ? "Đã thanh toán"
                              : transaction.status === "PENDING"
                                ? "Đang chờ"
                                : transaction.status === "EXPIRED"
                                  ? "Đã hết hạn"
                                  : "Đã hủy"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          value={transaction.providerStatus}
                          label={transaction.providerStatus}
                        />
                        {transaction.reconciliationError && (
                          <p
                            title={transaction.reconciliationError}
                            className="mt-1 max-w-40 truncate text-[10px] text-rose-500"
                          >
                            {transaction.reconciliationError}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {formatDashboardDate(
                          transaction.lastReconciledAt,
                          true
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {transaction.paymentUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Mở trang PayOS"
                              aria-label="Mở trang PayOS"
                              onClick={() =>
                                window.open(
                                  transaction.paymentUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Đối soát PayOS"
                            aria-label="Đối soát PayOS"
                            onClick={() =>
                              setPendingAction({
                                kind: "reconcile",
                                transaction,
                              })
                            }
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={transaction.status !== "PENDING"}
                            className="size-8 text-destructive hover:text-destructive"
                            title="Hủy giao dịch"
                            aria-label="Hủy giao dịch"
                            onClick={() =>
                              setPendingAction({
                                kind: "cancel",
                                transaction,
                              })
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={payments.pagination.page}
              totalPages={payments.pagination.pages}
              total={payments.pagination.total}
              onPageChange={setPaymentPage}
            />
          </section>
        </TabsContent>

        <TabsContent value="credits">
          <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
            <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={creditQuery}
                  onChange={(event) => {
                    setCreditQuery(event.target.value);
                    setCreditPage(1);
                  }}
                  placeholder="Tìm username, email hoặc reference"
                  aria-label="Tìm biến động credit"
                  className="h-10 pl-9"
                />
              </div>
              <DashboardSelect
                value={creditAction}
                onValueChange={(value) => {
                  setCreditAction(value);
                  setCreditPage(1);
                }}
                ariaLabel="Lọc loại credit"
                options={[
                  { value: "", label: "Mọi biến động" },
                  ...Object.entries(actionLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Thời gian</th>
                    <th className="px-4 py-3 font-bold">Người dùng</th>
                    <th className="px-4 py-3 font-bold">Loại</th>
                    <th className="px-4 py-3 font-bold">Nội dung</th>
                    <th className="px-4 py-3 text-right font-bold">Biến động</th>
                    <th className="px-4 py-3 text-right font-bold">Số dư hiện tại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {credits.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDashboardDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-foreground">
                          {log.user?.username || "Không xác định"}
                        </p>
                        <p className="max-w-48 truncate text-[11px] text-muted-foreground">
                          {log.user?.email || log.referenceId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">
                        {actionLabels[log.action] || log.action}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-80 truncate text-xs text-muted-foreground">
                          {log.description || "Không có mô tả"}
                        </p>
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-extrabold ${
                          log.credits >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {log.credits >= 0 ? "+" : ""}
                        {log.credits.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                        {log.user?.balance.toLocaleString("vi-VN") || "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={credits.pagination.page}
              totalPages={credits.pagination.pages}
              total={credits.pagination.total}
              onPageChange={setCreditPage}
            />
          </section>
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !mutating) {
            setPendingAction(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              {pendingAction?.kind === "cancel"
                ? "Hủy giao dịch PayOS"
                : "Đối soát giao dịch"}
            </DialogTitle>
            <DialogDescription>
              Giao dịch #{pendingAction?.transaction.orderCode} ·{" "}
              {vnd(pendingAction?.transaction.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          {pendingAction?.kind === "cancel" && (
            <label className="space-y-1.5 text-xs font-bold text-foreground">
              Lý do hủy
              <Textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Nhập lý do hủy giao dịch"
              />
            </label>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutating}
              onClick={() => setPendingAction(null)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant={
                pendingAction?.kind === "cancel" ? "destructive" : "default"
              }
              disabled={mutating}
              onClick={() => void executePaymentAction()}
            >
              {pendingAction?.kind === "cancel" ? (
                <X className="size-4" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {mutating
                ? "Đang xử lý..."
                : pendingAction?.kind === "cancel"
                  ? "Xác nhận hủy"
                  : "Đối soát ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={adjustOpen}
        onOpenChange={(open) => !mutating && setAdjustOpen(open)}
      >
        <DialogContent className="rounded-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              Điều chỉnh credit người dùng
            </DialogTitle>
            <DialogDescription>
              Mọi điều chỉnh được ghi vào sổ credit và nhật ký quản trị.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {selectedUser.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedUser.email} ·{" "}
                    {selectedUser.credits.toLocaleString("vi-VN")} credits
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Chọn người dùng khác"
                  title="Chọn người dùng khác"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserQuery("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <UserRoundSearch className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  value={userQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUserQuery(value);
                    if (value.trim().length < 2) setUserResults([]);
                  }}
                  placeholder="Tìm username hoặc email"
                  className="pl-9"
                />
                {userResults.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                    {userResults.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setUserResults([]);
                        }}
                        className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-foreground">
                            {user.username}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {user.credits.toLocaleString("vi-VN")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <label className="space-y-1.5 text-xs font-bold text-foreground">
              Credit thay đổi
              <div className="relative">
                {Number(adjustCredits) >= 0 ? (
                  <ArrowUpCircle className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
                ) : (
                  <ArrowDownCircle className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rose-500" />
                )}
                <Input
                  type="number"
                  step="1"
                  min="-1000000"
                  max="1000000"
                  value={adjustCredits}
                  onChange={(event) => setAdjustCredits(event.target.value)}
                  placeholder="+500 hoặc -200"
                  className="pl-9"
                />
              </div>
            </label>
            <label className="space-y-1.5 text-xs font-bold text-foreground">
              Lý do
              <Textarea
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                minLength={10}
                maxLength={500}
                rows={4}
                placeholder="Nêu rõ căn cứ điều chỉnh"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutating}
              onClick={() => setAdjustOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={mutating || !selectedUser}
              onClick={() => void submitAdjustment()}
            >
              <Coins className="size-4" />
              {mutating ? "Đang ghi sổ..." : "Xác nhận điều chỉnh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
