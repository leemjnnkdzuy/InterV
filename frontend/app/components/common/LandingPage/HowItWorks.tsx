"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { UploadMinimalistic, ChatSquareCode, Diploma } from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";

interface Step {
  num: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  colorClass: string;
  bgGradient: string;
  badgeColor: string;
}

const steps: Step[] = [
  {
    num: "001",
    titleKey: "landing.howItWorks.step1Title",
    descriptionKey: "landing.howItWorks.step1Description",
    icon: <UploadMinimalistic weight="BoldDuotone" className="w-7 h-7 text-rose-400" />,
    colorClass: "rose",
    bgGradient: "from-rose-500/5 to-purple-500/5 border-rose-500/10",
    badgeColor: "bg-rose-500/15 border-rose-500/20 text-rose-400"
  },
  {
    num: "002",
    titleKey: "landing.howItWorks.step2Title",
    descriptionKey: "landing.howItWorks.step2Description",
    icon: <ChatSquareCode weight="BoldDuotone" className="w-7 h-7 text-amber-400" />,
    colorClass: "amber",
    bgGradient: "from-amber-500/5 to-yellow-500/5 border-amber-500/10",
    badgeColor: "bg-amber-500/15 border-amber-500/20 text-amber-400"
  },
  {
    num: "003",
    titleKey: "landing.howItWorks.step3Title",
    descriptionKey: "landing.howItWorks.step3Description",
    icon: <Diploma weight="BoldDuotone" className="w-7 h-7 text-emerald-400" />,
    colorClass: "emerald",
    bgGradient: "from-emerald-500/5 to-teal-500/5 border-emerald-500/10",
    badgeColor: "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
  }
];

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="w-full px-6 md:px-36 py-28 bg-transparent relative z-10 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] rounded-full bg-primary/10 blur-[130px] pointer-events-none -z-10" />

      <div className="w-full mx-auto flex flex-col gap-16"> 
        
        {/* Header Grid (left text, right visual) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full">
          {/* Left Column: Title + Subtitle */}
          <div className="lg:col-span-7 flex flex-col gap-4 text-left">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight uppercase leading-[1.05]">
              {t("landing.howItWorks.titleLine1")} <br className="hidden md:inline" /> {t("landing.howItWorks.titleLine2")}
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl">
              {t("landing.howItWorks.description")}
            </p>
          </div>

          {/* Right Column: visual workflow preview */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="relative w-[280px] h-[360px] sm:w-[310px] sm:h-[400px] group/visual">
              {/* Offset Layer (Primary background, rotated clockwise, shifted top-right) */}
              <div className="absolute inset-0 rounded-[32px] bg-primary rotate-6 translate-x-3 -translate-y-3 transition-transform duration-300 group-hover/visual:rotate-8 group-hover/visual:scale-102" />
              {/* Main Visual Image Card */}
              <div className="absolute inset-0 rounded-[32px] overflow-hidden bg-zinc-950 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center justify-center z-10">
                
                {/* User audio/voice-call preview */}
                <div className="relative w-full h-full">
                  <Image
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=800&q=80" 
                    alt={t("landing.howItWorks.imageAlt")}
                    fill
                    sizes="(min-width: 640px) 310px, 280px"
                    className="object-cover brightness-[0.75]"
                    unoptimized
                  />
                  
                  {/* Voice Waveform Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent z-20">
                    <div className="flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded w-fit text-[10px] font-bold text-white uppercase tracking-wider mb-3">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      {t("landing.howItWorks.voiceActive")}
                    </div>
                    {/* Fake Waveform lines */}
                    <div className="flex items-end gap-1 h-8">
                      <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse" />
                      <div className="w-1 h-7 bg-emerald-400 rounded-full animate-pulse delay-75" />
                      <div className="w-1 h-5 bg-emerald-400 rounded-full animate-pulse delay-150" />
                      <div className="w-1 h-8 bg-emerald-400 rounded-full animate-pulse delay-300" />
                      <div className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse delay-200" />
                      <div className="w-1 h-6 bg-emerald-400 rounded-full animate-pulse delay-100" />
                      <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Steps Timeline Container */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-4">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-3xl border border-white/[0.06] hover:border-white/12 transition-colors duration-250 bg-zinc-950/40 backdrop-blur-md p-5 flex flex-col gap-4 overflow-hidden group/card shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            >
              {/* Ambient hover glow inside the card */}
              <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full bg-gradient-to-br opacity-0 group-hover/card:opacity-10 transition-opacity duration-300 pointer-events-none blur-3xl ${
                step.colorClass === "rose" ? "from-rose-500 to-purple-500" :
                step.colorClass === "amber" ? "from-amber-500 to-yellow-500" :
                "from-emerald-500 to-teal-500"
              }`} />

              {/* Top row */}
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-zinc-500/70 tracking-wider">{step.num}</span>
                <div className="w-10 h-10 flex items-center justify-center">
                  {step.icon}
                </div>
              </div>

              {/* Bottom Content Box with gradient background */}
              <div className={`bg-gradient-to-br rounded-2xl p-4 text-left border ${step.bgGradient}`}>
                <h4 className="font-extrabold text-white text-sm tracking-wide mb-2">
                  {t(step.titleKey)}
                </h4>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {t(step.descriptionKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
