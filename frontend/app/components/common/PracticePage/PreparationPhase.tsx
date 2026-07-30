"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import logoSrc from "@/app/assets/logo.svg";
import { Spinner } from "@/app/components/ui/spinner";
import { useLanguage } from "@/app/hooks/useLanguage";

const STEP_KEYS = [
  "practiceSetup.preparingContext",
  "practiceSetup.preparingQuestions",
  "practiceSetup.preparingVoice",
] as const;

export default function PreparationPhase() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, STEP_KEYS.length - 1));
    }, 3500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background px-6 text-center text-foreground">
      <div className="flex max-w-xl flex-col items-center">
        <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-primary/20" />
          <Spinner className="absolute h-20 w-20 text-primary/30" />
          <Image
            src={logoSrc}
            alt="InterV"
            width={40}
            height={40}
            className="object-contain invert dark:invert-0"
            priority
          />
        </div>
        <h1 className="text-2xl font-black tracking-normal md:text-3xl">
          {t("practiceSetup.preparingTitle")}
        </h1>
        <p className="mt-3 min-h-6 text-sm text-muted-foreground">
          {t(STEP_KEYS[step])}
        </p>
        <div className="mt-8 flex items-center gap-2" aria-hidden="true">
          {STEP_KEYS.map((key, index) => (
            <span
              key={key}
              className={`h-1.5 transition-all duration-500 ${
                index === step
                  ? "w-10 bg-primary"
                  : index < step
                    ? "w-5 bg-primary/60"
                    : "w-5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
