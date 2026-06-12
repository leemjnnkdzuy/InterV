"use client";

import React from "react";
import { Button } from "@/app/components/ui/button";
import { Phone, AltArrowRight } from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function FinalCta() {
  const { t } = useLanguage();

  return (
    <section id="final-cta" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto">
        
        {/* Dark Capsule Container */}
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-10 md:p-16 overflow-hidden flex flex-col items-center text-center gap-8 shadow-2xl border border-white/[0.08] backdrop-blur-md">
          
          {/* Ambient Glows */}
          <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-[var(--chart-1)]/10 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

          {/* Heading */}
          <div className="flex flex-col gap-4 max-w-2xl z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {t("landing.finalCta.title")}
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
              {t("landing.finalCta.description")}
            </p>
          </div>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto z-10 mt-2">
            {/* Candidate CTA */}
            <Button className="w-full sm:w-auto rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-8 py-5 h-auto text-sm transition-all flex items-center justify-center gap-2 group border-none shadow-[0_4px_20px_rgba(187,244,81,0.15)]">
              {t("landing.finalCta.candidateButton")}
              <AltArrowRight className="w-4 h-4 text-zinc-700 group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Employer CTA */}
            <Button className="w-full sm:w-auto rounded-full bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/40 text-white font-bold px-8 py-5 h-auto text-sm transition-all flex items-center justify-center gap-2">
              <Phone weight="BoldDuotone" className="w-6 h-6" />
              {t("landing.finalCta.employerButton")}
            </Button>
          </div>

        </div>

      </div>
    </section>
  );
}
