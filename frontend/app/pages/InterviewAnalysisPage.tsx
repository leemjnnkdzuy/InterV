"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Chart2,
  CheckCircle,
  DangerTriangle,
  DocumentText,
  Lightbulb,
  Microphone3,
} from "@solar-icons/react";
import { practiceService } from "@/app/services";
import { Spinner } from "@/app/components/ui/spinner";
import SilkBackground from "@/app/components/common/SilkBackground";
import { useLanguage } from "@/app/hooks/useLanguage";
import type { InterviewResultResponse } from "@/app/types";

interface InterviewAnalysisPageProps {
  practiceId: string;
  runId: string;
}

function clampScore(value: number | undefined): number {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function DeliveryMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="border-l-2 border-primary/60 pl-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

export default function InterviewAnalysisPage({
  practiceId,
  runId,
}: InterviewAnalysisPageProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [data, setData] = useState<InterviewResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadResult = async () => {
      try {
        const response = await practiceService.getInterviewResult(runId);
        if (!active) return;
        if (!response.success || !response.run) {
          throw new Error(response.message || t("analysis.loadFailed"));
        }
        setData(response);
      } catch (error: unknown) {
        if (!active) return;
        setErrorMessage(
          error instanceof Error ? error.message : t("analysis.loadFailed")
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadResult();
    return () => {
      active = false;
    };
  }, [runId, t]);

  const ratingRows = useMemo(() => {
    const ratings = data?.run?.result.ratings;
    return [
      {
        label: t("analysis.communication"),
        value: clampScore(ratings?.communication),
      },
      {
        label: t("analysis.knowledge"),
        value: clampScore(ratings?.knowledge),
      },
      {
        label: t("analysis.problemSolving"),
        value: clampScore(ratings?.problemSolving),
      },
      {
        label: t("analysis.jdFit"),
        value: clampScore(ratings?.jdFit),
      },
      {
        label: t("analysis.confidence"),
        value: clampScore(ratings?.confidence),
      },
      {
        label: t("analysis.composure"),
        value: clampScore(ratings?.composure),
      },
      {
        label: t("analysis.vocalDelivery"),
        value: clampScore(ratings?.vocalDelivery),
      },
    ];
  }, [data, t]);

  if (isLoading) {
    return (
      <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        <SilkBackground fadeBottom bottomColor="var(--background)" />
        <Spinner className="relative z-10 h-12 w-12 text-primary" />
      </div>
    );
  }

  if (errorMessage || !data?.run) {
    return (
      <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-center">
        <SilkBackground fadeBottom bottomColor="var(--background)" />
        <div className="relative z-10 max-w-md">
          <DangerTriangle
            className="mx-auto h-10 w-10 text-amber-500"
            weight="BoldDuotone"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-bold text-foreground">
            {t("analysis.notReady")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push(`/practice/${practiceId}`)}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" weight="BoldDuotone" />
            {t("analysis.backToPractice")}
          </button>
        </div>
      </div>
    );
  }

  const { run } = data;
  const result = run.result;
  const audioAnalysis = result.audioAnalysis;
  const usefulAudioObservations = (audioAnalysis?.observations || []).filter(
    (observation) =>
      !/sensevoice|\b(?:lid|aed|ser)\b|confidence\s*\/\s*composure|đã phân tích \d+ đoạn/i.test(
        observation
      )
  );
  const deliveryMetrics = audioAnalysis
    ? [
        typeof audioAnalysis.speakingRateWpm === "number" &&
          audioAnalysis.speakingRateWpm > 0 && {
          label: "Tốc độ nói",
          value: `${Math.round(audioAnalysis.speakingRateWpm)} từ/phút`,
          note:
            audioAnalysis.speakingRateWpm >= 105 &&
            audioAnalysis.speakingRateWpm <= 170
              ? "Nằm trong khoảng dễ theo dõi."
              : audioAnalysis.speakingRateWpm > 170
                ? "Khá nhanh, nên giảm tốc ở ý chính."
                : "Khá chậm, nên rút gọn phần dẫn nhập.",
        },
        typeof audioAnalysis.paceConsistency === "number" && {
          label: "Nhịp nói ổn định",
          value: `${audioAnalysis.paceConsistency}/100`,
          note:
            audioAnalysis.paceConsistency >= 70
              ? "Tốc độ giữa các câu khá nhất quán."
              : "Tốc độ thay đổi nhiều giữa các câu.",
        },
        typeof audioAnalysis.pauseRatio === "number" &&
          audioAnalysis.pauseRatio >= 0 && {
          label: "Khoảng lặng",
          value: `${audioAnalysis.pauseRatio}%`,
          note:
            audioAnalysis.pauseRatio >= 10 && audioAnalysis.pauseRatio <= 35
              ? "Có khoảng nghỉ vừa đủ để tách ý."
              : audioAnalysis.pauseRatio > 35
                ? "Có nhiều khoảng dừng dài."
                : "Ít khoảng nghỉ, câu trả lời có thể bị dồn.",
        },
        typeof audioAnalysis.volumeStability === "number" &&
          audioAnalysis.volumeStability >= 0 && {
          label: "Âm lượng ổn định",
          value: `${audioAnalysis.volumeStability}/100`,
          note:
            audioAnalysis.volumeStability >= 70
              ? "Âm lượng được duy trì tương đối đều."
              : "Âm lượng thay đổi đáng kể trong câu trả lời.",
        },
        typeof audioAnalysis.fillerWordCount === "number" && {
          label: "Từ đệm",
          value: `${audioAnalysis.fillerWordCount} lần`,
          note:
            audioAnalysis.fillerWordCount <= 2
              ? "Ít từ đệm, thông điệp khá gọn."
              : "Nên thay từ đệm bằng một nhịp dừng ngắn.",
        },
        typeof audioAnalysis.averageAnswerDurationSec === "number" &&
          audioAnalysis.averageAnswerDurationSec > 0 && {
          label: "Thời lượng trung bình",
          value: `${Math.round(audioAnalysis.averageAnswerDurationSec)} giây/câu`,
          note: `${audioAnalysis.analyzedAnswerCount || result.questions.length} câu trả lời có bản ghi âm.`,
        },
      ].filter(
        (metric): metric is { label: string; value: string; note: string } =>
          Boolean(metric)
      )
    : [];
  const locale =
    language === "zh" ? "zh-CN" : language === "en" ? "en-US" : "vi-VN";
  const completedAt = new Date(run.completedAt).toLocaleString(locale);

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <SilkBackground fadeBottom bottomColor="var(--background)" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-9">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <button
              type="button"
              onClick={() => router.push("/practice")}
              className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" weight="BoldDuotone" />
              {t("analysis.allPractices")}
            </button>
            <h1 className="text-2xl font-black md:text-3xl">
              {t("analysis.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {run.title} · {run.answeredCount}/{run.questionCount}{" "}
              {t("analysis.questions")} · {completedAt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/practice/${practiceId}`)}
            className="h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("analysis.practiceAgain")}
          </button>
        </header>

        {run.candidateIntro?.transcript && (
          <section className="border-b border-border/60 py-7">
            <h2 className="text-base font-black">
              {t("analysis.candidateIntroTitle")}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("analysis.candidateIntroDescription")}
            </p>
            <p className="mt-4 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-foreground/80">
              {run.candidateIntro.transcript}
            </p>
          </section>
        )}

        <section className="grid gap-8 border-b border-border/60 py-8 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-border/60 pb-8 lg:border-r lg:border-b-0 lg:pb-0">
            <span className="text-xs font-bold uppercase text-muted-foreground">
              {t("analysis.overallScore")}
            </span>
            <strong className="mt-2 text-7xl font-black text-primary">
              {clampScore(result.score)}
            </strong>
            <span className="text-sm font-bold text-muted-foreground">/ 100</span>
            <p className="mt-4 text-xs text-muted-foreground">
              {result.duration}
            </p>
          </div>

          <div>
            <div className="mb-5 flex items-center gap-2">
              <Chart2
                className="h-5 w-5 text-primary"
                weight="BoldDuotone"
                aria-hidden="true"
              />
              <h2 className="text-base font-black">{t("analysis.ratings")}</h2>
            </div>
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {ratingRows.map((rating) => (
                <div key={rating.label}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs font-semibold">
                    <span className="text-muted-foreground">{rating.label}</span>
                    <span>{rating.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${rating.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 py-8">
          <h2 className="text-base font-black">{t("analysis.summary")}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-foreground/80">
            {result.feedback}
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle
                  className="h-5 w-5"
                  weight="BoldDuotone"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-black">{t("analysis.strengths")}</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {result.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-amber-400">
                <DangerTriangle
                  className="h-5 w-5"
                  weight="BoldDuotone"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-black">{t("analysis.weaknesses")}</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {result.weaknesses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-primary">
                <Lightbulb
                  className="h-5 w-5"
                  weight="BoldDuotone"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-black">
                  {t("analysis.recommendations")}
                </h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {result.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {audioAnalysis && (
          <section className="border-b border-border/60 py-8 [&>p]:hidden [&>div:nth-of-type(2)]:hidden">
            <div className="flex items-center gap-2">
              <Microphone3
                className="h-5 w-5 text-primary"
                weight="BoldDuotone"
                aria-hidden="true"
              />
              <h2 className="text-base font-black">
                Hiệu quả trình bày bằng giọng nói
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("analysis.dominantEmotion")}:{" "}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {audioAnalysis.observations.map((observation) => (
                <p
                  key={observation}
                  className="border-l-2 border-primary/60 pl-3 text-sm leading-6 text-foreground/75"
                >
                  {observation}
                </p>
              ))}
            </div>

            <div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Các chỉ số phản ánh cách truyền đạt có thể quan sát được, không dùng
                để suy đoán tính cách hay trạng thái tâm lý.
              </p>

              {deliveryMetrics.length > 0 && (
                <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  {deliveryMetrics.map((metric) => (
                    <DeliveryMetric key={metric.label} {...metric} />
                  ))}
                </div>
              )}

              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Dữ liệu ghi nhận
                  </h3>
                  {usefulAudioObservations.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      {usefulAudioObservations.map((observation) => (
                        <li
                          key={observation}
                          className="border-l-2 border-primary/60 pl-3"
                        >
                          {observation}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Kết quả này được tạo trước khi có bộ chỉ số trình bày chi tiết.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-black text-primary">
                    Nên thử ở lần tiếp theo
                  </h3>
                  {(audioAnalysis.recommendations || []).length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      {(audioAnalysis.recommendations || []).map(
                        (recommendation) => (
                          <li
                            key={recommendation}
                            className="border-l-2 border-primary/60 pl-3"
                          >
                            {recommendation}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Thực hiện thêm một lượt để nhận gợi ý cải thiện dựa trên các
                      chỉ số mới.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="py-8">
          <div className="mb-5 flex items-center gap-2">
            <DocumentText
              className="h-5 w-5 text-primary"
              weight="BoldDuotone"
              aria-hidden="true"
            />
            <h2 className="text-base font-black">
              {t("analysis.questionReview")}
            </h2>
          </div>
          <div className="space-y-4">
            {result.questions.map((question, index) => (
              <article
                key={`${index}-${question.question}`}
                className="rounded-lg border border-border bg-card/75 p-5 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-black leading-6">
                    {index + 1}. {question.question}
                  </h3>
                  <span className="shrink-0 text-lg font-black text-primary">
                    {clampScore(question.score)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {question.answer}
                </p>
                <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-6 text-foreground/80">
                  {question.feedback}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
