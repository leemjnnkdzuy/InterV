"use client";

import Image from "next/image";

import logoSrc from "@/app/assets/logo.svg";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function PreparationPhase() {
  const { t } = useLanguage();

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center text-foreground"
      aria-busy="true"
    >
      <div className="flex animate-in fade-in zoom-in-95 flex-col items-center duration-500">
        <Image
          src={logoSrc}
          alt="InterV"
          width={96}
          height={96}
          className="h-24 w-24 object-contain invert dark:invert-0"
          priority
        />
        <p
          className="hero-shimmer-text mt-8 text-sm font-semibold tracking-wide sm:text-base"
          role="status"
          aria-live="polite"
        >
          {t("practiceSetup.preparingTitle")}
        </p>
      </div>
    </div>
  );
}
