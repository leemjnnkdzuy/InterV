"use client";

import React from "react";
import { CpuBolt, Pulse, LockKeyhole } from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";

interface Benefit {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  bgGlow: string;
  iconColor: string;
  iconBg: string;
}

const benefits: Benefit[] = [
  {
    titleKey: "landing.whyAi.benefit1Title",
    descriptionKey: "landing.whyAi.benefit1Description",
    icon: <CpuBolt weight="BoldDuotone" className="w-11 h-11" />,
    bgGlow: "bg-primary/5 dark:bg-[var(--chart-1)]/5",
    iconColor: "text-primary dark:text-[var(--chart-1)]",
    iconBg: "",
  },
  {
    titleKey: "landing.whyAi.benefit2Title",
    descriptionKey: "landing.whyAi.benefit2Description",
    icon: <Pulse weight="BoldDuotone" className="w-11 h-11" />,
    bgGlow: "bg-emerald-500/5",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "",
  },
  {
    titleKey: "landing.whyAi.benefit3Title",
    descriptionKey: "landing.whyAi.benefit3Description",
    icon: <LockKeyhole weight="BoldDuotone" className="w-11 h-11" />,
    bgGlow: "bg-violet-500/5",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "",
  },
];

export default function WhyOurAi() {
  const { t } = useLanguage();

  return (
    <section id="why-our-ai" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-primary dark:text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">{t("landing.whyAi.eyebrow")}</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {t("landing.whyAi.title")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            {t("landing.whyAi.description")}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="relative group rounded-3xl border border-border/80 dark:border-white/[0.08] hover:border-primary/40 bg-card/85 dark:bg-zinc-900/50 backdrop-blur-md p-8 flex flex-col gap-6 overflow-hidden shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300"
            >
              {/* Radial gradient background hover glow */}
              <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full ${benefit.bgGlow} blur-3xl`} />

              {/* Icon Container */}
              <div className={`w-12 h-12 ${benefit.iconColor} flex items-center justify-center z-10`}>
                {benefit.icon}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-3 z-10">
                <h4 className="font-bold text-foreground text-base md:text-lg">
                  {t(benefit.titleKey)}
                </h4>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  {t(benefit.descriptionKey)}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
