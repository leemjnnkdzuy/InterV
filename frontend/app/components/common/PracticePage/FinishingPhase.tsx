"use client";

import Image from "next/image";

import logoSrc from "@/app/assets/logo.svg";
import { Spinner } from "@/app/components/ui/spinner";

interface FinishingPhaseProps {
  completedSteps: number;
}

export default function FinishingPhase({
  completedSteps,
}: FinishingPhaseProps) {
  const activeStep = Math.min(Math.max(completedSteps, 0), 4);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center text-foreground"
      aria-busy="true"
    >
      <Image
        src={logoSrc}
        alt="InterV"
        width={96}
        height={96}
        className="h-24 w-24 object-contain invert dark:invert-0"
        priority
      />

      <div className="mt-8 flex items-center gap-3">
        <Spinner className="h-4 w-4 text-primary" />
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                index < activeStep ? "bg-primary" : "bg-muted/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
