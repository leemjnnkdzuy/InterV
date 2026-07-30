"use client";

import Image from "next/image";
import { ChatSquareCode, Library, Microphone } from "@solar-icons/react";
import { Progress } from "@/app/components/ui/progress";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function CandidatePractice() {
  const { t } = useLanguage();

  return (
    <section id="candidate-practice" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col gap-16">
        
        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Title + Subtitle + Features (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-10">
            
            {/* Header / Intro inside left column */}
            <div className="flex flex-col gap-4">
              <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">{t("landing.candidatePractice.eyebrow")}</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {t("landing.candidatePractice.title")}
              </h2>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                {t("landing.candidatePractice.description")}
              </p>
            </div>

            {/* Features List */}
            <div className="flex flex-col gap-6">
              
              {/* Feature 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-[var(--chart-1)]">
                  <Microphone weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-base md:text-lg">{t("landing.candidatePractice.feature1Title")}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {t("landing.candidatePractice.feature1Description")}
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-[var(--chart-1)]">
                  <ChatSquareCode weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-base md:text-lg">{t("landing.candidatePractice.feature2Title")}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {t("landing.candidatePractice.feature2Description")}
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-[var(--chart-1)]">
                  <Library weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-white text-base md:text-lg">{t("landing.candidatePractice.feature3Title")}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {t("landing.candidatePractice.feature3Description")}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: interactive result preview */}
          <div className="lg:col-span-6 flex lg:justify-end justify-center w-full">
            <div className="relative w-full max-w-[540px] group/card">
              {/* Card Ambient Glow behind the card */}
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-[var(--chart-1)]/10 to-violet-500/10 opacity-0 group-hover/card:opacity-100 blur-2xl transition duration-500" />
              
              {/* Card Container */}
              <div className="relative w-full rounded-3xl overflow-hidden border border-white/[0.06] bg-zinc-950/40 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row lg:flex-col xl:flex-row hover:border-white/10 transition-all duration-300 sm:h-[360px] lg:h-[440px] xl:h-[400px]">
                
                {/* Left Side: Voice Stream Simulation */}
                <div className="relative w-full sm:w-1/2 lg:w-full xl:w-1/2 h-56 sm:h-full lg:h-56 xl:h-full overflow-hidden bg-zinc-900 flex flex-col items-center justify-center p-6 border-b sm:border-b-0 lg:border-b xl:border-b-0 border-white/[0.06]">
                  {/* Voice Wave rings */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-48 h-48 rounded-full border border-[var(--chart-1)]/20 animate-ping absolute" />
                    <div className="w-32 h-32 rounded-full border border-[var(--chart-1)]/30 animate-pulse absolute" />
                  </div>
                  
                  {/* Candidate Avatar in Center */}
                  <div className="relative z-10 w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--chart-1)] shadow-[0_0_30px_rgba(187,244,81,0.2)]">
                    <Image
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80"
                      alt={t("landing.candidatePractice.avatarAlt")}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="absolute bottom-4 left-4 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--chart-1)] text-zinc-950 shadow-lg">
                    <Microphone className="w-4 h-4" />
                  </div>
                </div>

                {/* Right Side: AI Analytics Card overlay */}
                <div className="w-full sm:w-1/2 lg:w-full xl:w-1/2 p-6 flex flex-col justify-between bg-zinc-900/30 backdrop-blur-md text-white border-t sm:border-t-0 sm:border-l lg:border-t lg:border-l-0 xl:border-t-0 xl:border-l border-white/[0.06]">
                  <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t("landing.candidatePractice.resultLabel")}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white">8.5</span>
                        <span className="text-zinc-500 text-xs">/10</span>
                        <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded ml-2">{t("landing.candidatePractice.excellent")}</span>
                      </div>
                    </div>

                    {/* Metrics List */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">{t("landing.candidatePractice.speakingSpeed")}</span>
                          <span className="font-medium text-zinc-200">{t("landing.candidatePractice.wordsPerMinute")}</span>
                        </div>
                        <Progress value={85} className="h-1.5 bg-white/10" />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">{t("landing.candidatePractice.fillerWords")}</span>
                          <span className="font-medium text-zinc-200">{t("landing.candidatePractice.fillerCount")}</span>
                        </div>
                        <Progress value={90} className="h-1.5 bg-white/10" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">{t("landing.candidatePractice.presence")}</span>
                          <span className="font-medium text-zinc-200">{t("landing.candidatePractice.confident")}</span>
                        </div>
                        <Progress value={88} className="h-1.5 bg-white/10" />
                      </div>
                    </div>
                  </div>

                  {/* AI Advice Box */}
                  <div className="mt-4 bg-zinc-950/40 rounded-xl p-3 border border-white/5">
                    <span className="text-[10px] font-bold text-[var(--chart-1)] uppercase tracking-wider">{t("landing.candidatePractice.aiAdvice")}</span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-medium mt-1">
                      {t("landing.candidatePractice.adviceText")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
