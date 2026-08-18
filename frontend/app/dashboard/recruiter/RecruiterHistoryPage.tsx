"use client";

import { useCallback, useEffect, useState } from "react";
import { CupStar as Trophy, Eye, History, UserCheck } from "@solar-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  DashboardError,
  DashboardLoading,
  DashboardPageHeader,
  EmptyState,
  formatDashboardDate,
  MetricCard,
  PaginationControls,
  StatusBadge,
} from "@/app/dashboard/components/DashboardPrimitives";
import { dashboardRequest } from "@/app/dashboard/lib/client";

interface EvaluationResult {
  score: number;
  duration?: string;
  feedback?: string;
  candidateIntro?: {
    transcript: string;
  };
  candidateIntroItems?: Array<{
    category: string;
    label: string;
    value: string;
    evidence?: string[];
  }>;
  ratings?: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  questions?: Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number;
  }>;
}

interface HistoryItem {
  invitationId: string;
  practiceSessionId: string;
  candidate: {
    username: string;
    email: string;
    avatar?: string;
  } | null;
  campaign: {
    id: string;
    title: string;
    jobTitle: string;
    department?: string;
  } | null;
  score: number;
  attemptCount: number;
  result: EvaluationResult | null;
  completedAt?: string;
}

interface HistoryResponse {
  success: true;
  interviews: HistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function RecruiterHistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(
        await dashboardRequest<HistoryResponse>(
          `/api/recruiter/history?page=${page}&limit=20`
        )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải lịch sử"
      );
    }
  }, [page]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const average =
    data && data.interviews.length > 0
      ? Math.round(
          data.interviews.reduce((sum, item) => sum + item.score, 0) /
            data.interviews.length
        )
      : 0;
  const best =
    data && data.interviews.length > 0
      ? Math.max(...data.interviews.map((item) => item.score))
      : 0;

  return (
    <>
      <DashboardPageHeader
        eyebrow="Interview Results"
        title="Lịch sử & kết quả"
        description="Kết quả đã chấm, năng lực theo tiêu chí và phản hồi chi tiết của từng ứng viên."
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Đã hoàn thành"
          value={data?.pagination.total || 0}
          icon={UserCheck}
          tone="lime"
        />
        <MetricCard
          label="Điểm trung bình trên trang"
          value={average ? `${average}/100` : "N/A"}
          icon={History}
          tone="cyan"
        />
        <MetricCard
          label="Điểm cao nhất trên trang"
          value={best ? `${Math.round(best)}/100` : "N/A"}
          icon={Trophy}
          tone="amber"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
        {!data && !error ? (
          <DashboardLoading label="Đang tải kết quả phỏng vấn" />
        ) : error ? (
          <DashboardError message={error} onRetry={() => void load()} />
        ) : data?.interviews.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Chưa có kết quả phỏng vấn" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-bold">Ứng viên</th>
                    <th className="px-4 py-3 font-bold">Vị trí</th>
                    <th className="px-4 py-3 text-center font-bold">Điểm</th>
                    <th className="px-4 py-3 text-center font-bold">Số lượt</th>
                    <th className="px-4 py-3 font-bold">Hoàn thành</th>
                    <th className="px-4 py-3 text-right font-bold">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.interviews.map((item) => (
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
                        <p className="text-sm font-semibold">
                          {item.campaign?.jobTitle || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.campaign?.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge
                          value="COMPLETED"
                          label={`${Math.round(item.score)}/100`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold">
                        {item.attemptCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDashboardDate(item.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!item.result}
                          onClick={() => setSelected(item)}
                        >
                          <Eye className="size-4" />
                          Xem
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
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-lg sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold">
              {selected?.candidate?.username} ·{" "}
              {selected?.campaign?.jobTitle}
            </DialogTitle>
            <DialogDescription>
              {selected?.result?.duration || "Phỏng vấn AI"} ·{" "}
              {formatDashboardDate(selected?.completedAt)}
            </DialogDescription>
          </DialogHeader>
          {selected?.result && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/70 p-4">
                <span className="text-sm font-semibold text-muted-foreground">
                  Điểm tổng
                </span>
                <strong className="text-3xl font-extrabold text-primary">
                  {Math.round(selected.result.score)}/100
                </strong>
              </div>
              {selected.result.ratings && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(selected.result.ratings).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                      >
                        <span className="text-xs capitalize text-muted-foreground">
                          {key}
                        </span>
                        <strong className="text-sm">
                          {Math.round(value)}/100
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
              {selected.result.feedback && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">
                    Nhận xét tổng quan
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {selected.result.feedback}
                  </p>
                </div>
              )}
              {selected.result.candidateIntroItems &&
                selected.result.candidateIntroItems.length > 0 && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">
                      Thông tin trích xuất từ phần giới thiệu
                    </h4>
                    <dl className="mt-3 divide-y divide-border/60">
                      {selected.result.candidateIntroItems.map((item, index) => (
                        <div
                          key={`${item.category}-${item.label}-${index}`}
                          className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-3"
                        >
                          <dt className="text-xs font-semibold text-muted-foreground">
                            {item.label}
                          </dt>
                          <dd className="whitespace-pre-wrap text-sm leading-6">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              {selected.result.candidateIntro?.transcript && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">
                    Giới thiệu ứng viên
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {selected.result.candidateIntro.transcript}
                  </p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["Điểm mạnh", selected.result.strengths],
                  ["Điểm cần cải thiện", selected.result.weaknesses],
                ].map(([title, items]) => (
                  <div
                    key={title as string}
                    className="rounded-lg border border-border/70 p-4"
                  >
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">
                      {title as string}
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {Array.isArray(items) && items.length > 0 ? (
                        items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">Chưa có dữ liệu</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
              {selected.result.questions &&
                selected.result.questions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">
                      Chi tiết từng câu
                    </h4>
                    <div className="mt-2 divide-y divide-border/60 rounded-lg border border-border/70">
                      {selected.result.questions.map((question, index) => (
                        <div key={`${index}-${question.question}`} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm font-bold">
                              {index + 1}. {question.question}
                            </p>
                            <StatusBadge
                              value="COMPLETED"
                              label={`${Math.round(question.score)}/100`}
                            />
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {question.feedback}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
