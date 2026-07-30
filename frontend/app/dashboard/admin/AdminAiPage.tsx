"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChartSquare as Activity,
  CodeScan as Bot,
  Cpu as BrainCircuit,
  ClockSquare as Clock3,
  DollarMinimalistic as Coins,
  Database as DatabaseZap,
  Refresh as RefreshCw,
  Diskette as Save,
  TuningSquare as Settings2,
  DangerTriangle as TriangleAlert,
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
  MetricCard,
  PaginationControls,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface PricingRow {
  model: string;
  cacheHitInputUsdPerMillion: number;
  cacheMissInputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

interface AiData {
  success: true;
  metrics: {
    events: number;
    successfulEvents: number;
    failedEvents: number;
    requests: number;
    successfulRequests: number;
    failedRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheHitTokens: number;
    cacheMissTokens: number;
    reasoningTokens: number;
    latencyMs: number;
    estimatedCostUsd: number;
    successRate: number;
    cacheHitRate: number;
    averageLatencyMs: number;
    monthlySpendUsd: number;
    monthlyBudgetUsd: number;
    budgetUsageRate: number;
  };
  trend: Array<{
    date: string;
    requests: number;
    tokens: number;
    costUsd: number;
    failedEvents: number;
  }>;
  byModel: Array<{
    model: string;
    events: number;
    requests: number;
    tokens: number;
    costUsd: number;
  }>;
  byOperation: Array<{
    operation: string;
    events: number;
    requests: number;
    tokens: number;
    costUsd: number;
    averageLatencyMs: number;
  }>;
  usage: Array<{
    id: string;
    user: { username: string; email: string } | null;
    practiceRunId: string;
    aiRunId: string;
    operation: string;
    status: "SUCCESS" | "FAILED";
    model: string;
    requestCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheHitTokens: number;
    reasoningTokens: number;
    latencyMs: number;
    estimatedCostUsd: number;
    errorCode?: string;
    errorMessage?: string;
    createdAt: string;
  }>;
  pagination: { page: number; limit: number; total: number; pages: number };
  settings: {
    pricing: PricingRow[];
    monthlyBudgetUsd: number;
    lowBalanceThresholdUsd: number;
  };
}

interface BalanceData {
  success: true;
  service: {
    reachable: boolean;
    transport: string;
    deepseekConfigured: boolean;
    ragReady: boolean;
  };
  provider: {
    reachable: boolean;
    isAvailable: boolean;
    balances: Array<{
      currency: string;
      totalBalance: string;
      grantedBalance: string;
      toppedUpBalance: string;
    }>;
    fastModel: string;
    evalModel: string;
    checkedAt: string;
    lowBalance: boolean;
  };
}

const operationLabels: Record<string, string> = {
  interview_start: "Khởi tạo",
  interview_follow_up: "Câu hỏi tiếp",
  interview_evaluate: "Chấm điểm",
};

function usd(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: compact ? 2 : value < 0.01 ? 6 : 4,
    maximumFractionDigits: compact ? 2 : value < 0.01 ? 8 : 4,
  }).format(value || 0);
}

function duration(value: number) {
  if (value < 1_000) return `${Math.round(value)} ms`;
  return `${(value / 1_000).toFixed(1)} s`;
}

export default function AdminAiPage() {
  const [data, setData] = useState<AiData | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [error, setError] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [operation, setOperation] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AiData["settings"] | null>(null);
  const [saving, setSaving] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      days: String(days),
      page: String(page),
      limit: "20",
    });
    if (status) params.set("status", status);
    if (operation) params.set("operation", operation);
    return `/api/admin/ai?${params.toString()}`;
  }, [days, operation, page, status]);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await dashboardRequest<AiData>(endpoint);
      setData(response);
      setSettings(response.settings);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải dữ liệu DeepSeek"
      );
    }
  }, [endpoint]);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      setBalance(
        await dashboardRequest<BalanceData>("/api/admin/ai/balance")
      );
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBalance(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBalance]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await dashboardRequest("/api/admin/ai", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      toast.success("Đã lưu cấu hình DeepSeek");
      setSettingsOpen(false);
      await load();
      await loadBalance();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu cấu hình"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!data && !error) {
    return <DashboardLoading label="Đang tổng hợp usage DeepSeek" />;
  }
  if (error || !data) {
    return <DashboardError message={error} onRetry={() => void load()} />;
  }

  const maxTrendTokens = Math.max(
    1,
    ...data.trend.map((item) => item.tokens)
  );
  const usdBalance = balance?.provider.balances.find(
    (item) => item.currency === "USD"
  );
  const providerHealthy =
    balance?.service.reachable &&
    balance.provider.reachable &&
    balance.provider.isAvailable;

  return (
    <>
      <DashboardPageHeader
        eyebrow="AI Operations"
        title="DeepSeek & AI usage"
        description="Số dư nhà cung cấp, token, cache, chi phí, độ trễ và lỗi từ các lượt phỏng vấn thực tế."
        actions={
          <>
            <div className="flex h-9 rounded-md border border-border bg-card p-0.5">
              {[7, 30, 90].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => {
                    setDays(value);
                    setPage(1);
                  }}
                  className={`min-w-12 rounded-sm px-2 text-xs font-bold ${
                    days === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value}N
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="size-4" />
              Cấu hình
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Làm mới"
              aria-label="Làm mới"
              onClick={() => {
                void load();
                void loadBalance();
              }}
            >
              <RefreshCw className="size-4" />
            </Button>
          </>
        }
      />

      <section className="mb-5 overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="grid gap-px bg-border/70 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div className="flex min-h-28 items-center gap-4 bg-card p-4">
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-md ${
                providerHealthy
                  ? "bg-emerald-500/12 text-emerald-500"
                  : "bg-rose-500/12 text-rose-500"
              }`}
            >
              {providerHealthy ? (
                <DatabaseZap className="size-5" />
              ) : (
                <TriangleAlert className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-foreground">
                  DeepSeek API
                </h3>
                <StatusBadge
                  value={providerHealthy ? "ACTIVE" : "FAILED"}
                  label={
                    balanceLoading
                      ? "Đang kiểm tra"
                      : providerHealthy
                        ? "Sẵn sàng"
                        : "Mất kết nối"
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                gRPC {balance?.service.transport || "grpc"} · RAG{" "}
                {balance?.service.ragReady ? "ready" : "unavailable"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {balance
                  ? formatDashboardDate(balance.provider.checkedAt)
                  : "Chưa lấy được trạng thái live"}
              </p>
            </div>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Số dư USD
            </p>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              {balanceLoading
                ? "..."
                : usdBalance
                  ? `$${usdBalance.totalBalance}`
                  : "Không khả dụng"}
            </p>
            <p
              className={`mt-1 text-xs ${
                balance?.provider.lowBalance
                  ? "font-bold text-amber-500"
                  : "text-muted-foreground"
              }`}
            >
              Granted ${usdBalance?.grantedBalance || "0"} · Top-up $
              {usdBalance?.toppedUpBalance || "0"}
            </p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">
              Model đang chạy
            </p>
            <p className="mt-2 truncate text-sm font-extrabold text-foreground">
              {balance?.provider.fastModel || "Chưa xác định"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Eval: {balance?.provider.evalModel || "Chưa xác định"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Chi phí kỳ chọn"
          value={usd(data.metrics.estimatedCostUsd)}
          detail={`${data.metrics.requests.toLocaleString("vi-VN")} request provider`}
          icon={Coins}
          tone="lime"
        />
        <MetricCard
          label="Chi phí tháng"
          value={usd(data.metrics.monthlySpendUsd)}
          detail={`${data.metrics.budgetUsageRate.toFixed(1)}% ngân sách ${usd(data.metrics.monthlyBudgetUsd, true)}`}
          icon={Activity}
          tone={data.metrics.budgetUsageRate >= 80 ? "rose" : "cyan"}
        />
        <MetricCard
          label="Tổng token"
          value={data.metrics.totalTokens.toLocaleString("vi-VN")}
          detail={`${data.metrics.promptTokens.toLocaleString("vi-VN")} input · ${data.metrics.completionTokens.toLocaleString("vi-VN")} output`}
          icon={BrainCircuit}
          tone="violet"
        />
        <MetricCard
          label="Cache hit"
          value={`${data.metrics.cacheHitRate.toFixed(1)}%`}
          detail={`${data.metrics.cacheHitTokens.toLocaleString("vi-VN")} token cache`}
          icon={DatabaseZap}
          tone="cyan"
        />
        <MetricCard
          label="Tỷ lệ thành công"
          value={`${data.metrics.successRate.toFixed(1)}%`}
          detail={`${data.metrics.failedRequests} request lỗi`}
          icon={Bot}
          tone={data.metrics.successRate < 98 ? "rose" : "lime"}
        />
        <MetricCard
          label="Độ trễ trung bình"
          value={duration(data.metrics.averageLatencyMs)}
          detail={`${data.metrics.reasoningTokens.toLocaleString("vi-VN")} reasoning token`}
          icon={Clock3}
          tone="amber"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold text-foreground">
              Token theo ngày
            </h3>
          </div>
          {data.trend.length === 0 ? (
            <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Chưa có usage trong kỳ
            </p>
          ) : (
            <div className="flex h-64 items-end gap-2 overflow-x-auto px-4 pb-4 pt-8">
              {data.trend.map((item) => (
                <div
                  key={item.date}
                  className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2"
                  title={`${item.tokens.toLocaleString("vi-VN")} token · ${usd(item.costUsd)}`}
                >
                  <span className="text-[10px] font-bold text-foreground">
                    {item.tokens.toLocaleString("vi-VN")}
                  </span>
                  <div className="flex h-40 w-full items-end justify-center rounded-sm bg-muted/60">
                    <div
                      className={`w-[58%] min-w-3 rounded-t-sm ${
                        item.failedEvents > 0 ? "bg-rose-500" : "bg-primary"
                      }`}
                      style={{
                        height: `${Math.max(
                          3,
                          (item.tokens / maxTrendTokens) * 100
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
        </div>

        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-extrabold text-foreground">
              Theo tác vụ
            </h3>
          </div>
          <div className="divide-y divide-border/60">
            {data.byOperation.map((item) => (
              <div key={item.operation} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">
                    {operationLabels[item.operation] || item.operation}
                  </p>
                  <span className="text-xs font-extrabold text-foreground">
                    {usd(item.costUsd)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.requests} request ·{" "}
                  {item.tokens.toLocaleString("vi-VN")} token ·{" "}
                  {duration(item.averageLatencyMs)}
                </p>
              </div>
            ))}
            {data.byOperation.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                Chưa có tác vụ
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-extrabold text-foreground">
            Nhật ký DeepSeek
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <DashboardSelect
              value={operation}
              onValueChange={(value) => {
                setOperation(value);
                setPage(1);
              }}
              ariaLabel="Lọc tác vụ AI"
              triggerClassName="h-9 min-w-36 text-xs"
              options={[
                { value: "", label: "Mọi tác vụ" },
                { value: "interview_start", label: "Khởi tạo" },
                { value: "interview_follow_up", label: "Câu hỏi tiếp" },
                { value: "interview_evaluate", label: "Chấm điểm" },
              ]}
            />
            <DashboardSelect
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              ariaLabel="Lọc trạng thái AI"
              triggerClassName="h-9 min-w-36 text-xs"
              options={[
                { value: "", label: "Mọi trạng thái" },
                { value: "SUCCESS", label: "Thành công" },
                { value: "FAILED", label: "Thất bại" },
              ]}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Thời gian</th>
                <th className="px-4 py-3 font-bold">Người dùng</th>
                <th className="px-4 py-3 font-bold">Tác vụ</th>
                <th className="px-4 py-3 font-bold">Model</th>
                <th className="px-4 py-3 text-right font-bold">Token</th>
                <th className="px-4 py-3 text-right font-bold">Cache</th>
                <th className="px-4 py-3 text-right font-bold">Latency</th>
                <th className="px-4 py-3 text-right font-bold">Chi phí</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.usage.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDashboardDate(item.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-foreground">
                      {item.user?.username || "Không xác định"}
                    </p>
                    <p className="max-w-48 truncate text-[11px] text-muted-foreground">
                      {item.user?.email || item.practiceRunId}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-foreground">
                    {operationLabels[item.operation] || item.operation}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.model || "unknown"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                    {item.totalTokens.toLocaleString("vi-VN")}
                    <span className="block font-normal text-muted-foreground">
                      {item.requestCount} req
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {item.cacheHitTokens.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {duration(item.latencyMs)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-foreground">
                    {usd(item.estimatedCostUsd)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      value={
                        item.status === "SUCCESS" ? "COMPLETED" : "FAILED"
                      }
                      label={
                        item.status === "SUCCESS" ? "Thành công" : "Thất bại"
                      }
                    />
                    {item.errorMessage && (
                      <p
                        className="mt-1 max-w-48 truncate text-[10px] text-rose-500"
                        title={item.errorMessage}
                      >
                        {item.errorMessage}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={data.pagination.page}
          totalPages={data.pagination.pages}
          total={data.pagination.total}
          onPageChange={setPage}
        />
      </section>

      <Dialog
        open={settingsOpen}
        onOpenChange={(open) => !saving && setSettingsOpen(open)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">
              Cấu hình chi phí DeepSeek
            </DialogTitle>
            <DialogDescription>
              Đơn giá USD trên một triệu token và ngưỡng giám sát nội bộ.
            </DialogDescription>
          </DialogHeader>
          {settings && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-bold text-foreground">
                  Ngân sách tháng (USD)
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.monthlyBudgetUsd}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        monthlyBudgetUsd: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-foreground">
                  Cảnh báo số dư thấp (USD)
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.lowBalanceThresholdUsd}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        lowBalanceThresholdUsd: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-bold">Model</th>
                      <th className="px-3 py-2 font-bold">Cache hit input</th>
                      <th className="px-3 py-2 font-bold">Cache miss input</th>
                      <th className="px-3 py-2 font-bold">Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {settings.pricing.map((row, index) => (
                      <tr key={row.model}>
                        <td className="px-3 py-2 text-xs font-bold">
                          {row.model}
                        </td>
                        {(
                          [
                            "cacheHitInputUsdPerMillion",
                            "cacheMissInputUsdPerMillion",
                            "outputUsdPerMillion",
                          ] as const
                        ).map((field) => (
                          <td key={field} className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.000001"
                              value={row[field]}
                              aria-label={`${row.model} ${field}`}
                              onChange={(event) => {
                                const pricing = settings.pricing.map(
                                  (item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          [field]: Number(event.target.value),
                                        }
                                      : item
                                );
                                setSettings({ ...settings, pricing });
                              }}
                              className="h-9"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setSettingsOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings()}
            >
              <Save className="size-4" />
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
