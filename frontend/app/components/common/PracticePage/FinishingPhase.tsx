"use client";

import Image from "next/image";

import logoSrc from "@/app/assets/logo.svg";
import { useLanguage } from "@/app/hooks/useLanguage";

const STEP_KEYS = [
  "interview.finishLogNormalize",
  "interview.finishLogAudio",
  "interview.finishLogEvaluate",
  "interview.finishLogSave",
] as const;

interface FinishingPhaseProps {
  completedSteps: number;
}

export default function FinishingPhase({
  completedSteps,
}: FinishingPhaseProps) {
  const { t } = useLanguage();
  const activeStep = Math.min(
    Math.max(completedSteps - 1, 0),
    STEP_KEYS.length - 1
  );

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex items-center justify-center">
          <Image
            src={logoSrc}
            alt="InterV"
            width={96}
            height={96}
            className="h-24 w-24 object-contain invert dark:invert-0"
            priority
          />
        </div>

        <h1 className="max-w-lg text-2xl font-black tracking-tight md:text-3xl">
          {t("interview.finishingTitle")}
        </h1>
        <p className="mt-3 min-h-6 text-sm text-muted-foreground">
          {t("interview.finishingDescription")}
        </p>

        <div className="mt-8 grid w-full gap-2">
          {STEP_KEYS.map((key, index) => {
            const isActive = index === activeStep;
            const isComplete = index < activeStep;

            return (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-500 ${
                  isActive
                    ? "border-primary/35 bg-primary/10 text-foreground shadow-lg shadow-primary/5"
                    : isComplete
                      ? "border-primary/15 bg-primary/[0.04] text-foreground/75"
                      : "border-white/[0.06] bg-black/10 text-muted-foreground/70"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive || isComplete
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/20 text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-xs font-medium">{t(key)}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
