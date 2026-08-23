"use client";

import React from "react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import {
  DangerTriangle,
  Exit,
  MedalStar,
} from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";
import { Spinner } from "@/app/components/ui/spinner";

export interface EarlyFinishConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  answeredCount: number;
  totalQuestions: number;
  isFinishing?: boolean;
}

export default function EarlyFinishConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  answeredCount,
  totalQuestions,
  isFinishing = false,
}: EarlyFinishConfirmDialogProps) {
  const { t } = useLanguage();
  const hasAnswers = answeredCount > 0;
  const progressPercent = Math.min(
    100,
    Math.round((answeredCount / Math.max(1, totalQuestions)) * 100)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[460px] rounded-3xl border border-border/60 bg-background/95 p-6 backdrop-blur-2xl shadow-2xl"
        showCloseButton={!isFinishing}
      >
        <div className="flex flex-col items-center text-center pt-2">
          {/* Status Icon */}
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 ${
              hasAnswers
                ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 dark:bg-amber-500/15"
                : "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20 dark:bg-rose-500/15"
            }`}
          >
            {hasAnswers ? (
              <MedalStar className="h-8 w-8" weight="BoldDuotone" />
            ) : (
              <DangerTriangle className="h-8 w-8" weight="BoldDuotone" />
            )}
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold text-foreground text-center">
              {t("interview.finishEarlyConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm text-center leading-relaxed">
              {hasAnswers
                ? t("interview.finishEarlyConfirmDescWithAnswers", {
                    answered: answeredCount,
                    total: totalQuestions,
                  })
                : t("interview.finishEarlyConfirmDescNoAnswers")}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Overview Card */}
          <div className="mt-5 w-full rounded-2xl border border-border/50 bg-muted/30 p-4 text-left">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">
                {t("interview.progressCompleted")}
              </span>
              <span className="text-foreground">
                {answeredCount} / {totalQuestions} ({progressPercent}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  hasAnswers
                    ? "bg-gradient-to-r from-amber-500 to-primary"
                    : "bg-muted-foreground/30"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isFinishing}
              className="flex-1 rounded-2xl h-11 text-sm font-medium border-border/80 hover:bg-muted/60 transition-colors"
            >
              {t("interview.finishEarlyCancel")}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isFinishing}
              className={`flex-1 rounded-2xl h-11 text-sm font-medium transition-all shadow-md ${
                hasAnswers
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                  : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20"
              }`}
            >
              {isFinishing ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" />
                  <span>{t("interview.closingEvaluating")}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  {hasAnswers ? (
                    <MedalStar className="h-4 w-4" weight="BoldDuotone" />
                  ) : (
                    <Exit className="h-4 w-4" weight="BoldDuotone" />
                  )}
                  <span>
                    {hasAnswers
                      ? t("interview.finishEarlyConfirmSubmit")
                      : t("interview.finishEarlyConfirmExit")}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
