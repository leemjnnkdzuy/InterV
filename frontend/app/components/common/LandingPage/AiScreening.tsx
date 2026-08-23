"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UsersGroupRounded, Chart, ShieldCheck, AltArrowRight, ArrowLeft, CheckCircle, ClockCircle } from "@solar-icons/react";
import { Progress } from "@/app/components/ui/progress";
import { useLanguage } from "@/app/hooks/useLanguage";

interface Candidate {
  id: string;
  name: string;
  roleKey: string;
  match: number;
  culture: string;
  status: "Passed" | "Review" | "Failed";
  avatar: string;
  summaryKey: string;
  details: {
    labelKey: string;
    value: number;
  }[];
  highlights: {
    textKey: string;
    type: "positive" | "negative" | "neutral";
  }[];
}

const sampleCandidates: Candidate[] = [
  {
    id: "1",
    name: "Nguyễn Văn An",
    roleKey: "landing.aiScreening.candidate1Role",
    match: 92,
    culture: "9.0/10",
    status: "Passed",
    avatar: "A",
    summaryKey: "landing.aiScreening.candidate1Summary",
    details: [
      { labelKey: "landing.aiScreening.candidate1Detail1", value: 95 },
      { labelKey: "landing.aiScreening.candidate1Detail2", value: 90 },
      { labelKey: "landing.aiScreening.candidate1Detail3", value: 92 },
      { labelKey: "landing.aiScreening.candidate1Detail4", value: 88 }
    ],
    highlights: [
      { textKey: "landing.aiScreening.candidate1Highlight1", type: "positive" },
      { textKey: "landing.aiScreening.candidate1Highlight2", type: "positive" },
      { textKey: "landing.aiScreening.candidate1Highlight3", type: "neutral" }
    ]
  },
  {
    id: "2",
    name: "Trần Thị Minh",
    roleKey: "landing.aiScreening.candidate2Role",
    match: 87,
    culture: "8.5/10",
    status: "Review",
    avatar: "M",
    summaryKey: "landing.aiScreening.candidate2Summary",
    details: [
      { labelKey: "landing.aiScreening.candidate2Detail1", value: 92 },
      { labelKey: "landing.aiScreening.candidate2Detail2", value: 70 },
      { labelKey: "landing.aiScreening.candidate2Detail3", value: 85 },
      { labelKey: "landing.aiScreening.candidate2Detail4", value: 88 }
    ],
    highlights: [
      { textKey: "landing.aiScreening.candidate2Highlight1", type: "positive" },
      { textKey: "landing.aiScreening.candidate2Highlight2", type: "positive" },
      { textKey: "landing.aiScreening.candidate2Highlight3", type: "negative" }
    ]
  },
  {
    id: "3",
    name: "Phạm Minh Đức",
    roleKey: "landing.aiScreening.candidate3Role",
    match: 62,
    culture: "6.0/10",
    status: "Failed",
    avatar: "Đ",
    summaryKey: "landing.aiScreening.candidate3Summary",
    details: [
      { labelKey: "landing.aiScreening.candidate3Detail1", value: 75 },
      { labelKey: "landing.aiScreening.candidate3Detail2", value: 50 },
      { labelKey: "landing.aiScreening.candidate3Detail3", value: 65 },
      { labelKey: "landing.aiScreening.candidate3Detail4", value: 55 }
    ],
    highlights: [
      { textKey: "landing.aiScreening.candidate3Highlight1", type: "positive" },
      { textKey: "landing.aiScreening.candidate3Highlight2", type: "negative" },
      { textKey: "landing.aiScreening.candidate3Highlight3", type: "negative" }
    ]
  }
];

export default function AiScreening() {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string>("1");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState<boolean>(false);

  const selectedCandidate =
    sampleCandidates.find((candidate) => candidate.id === selectedId) ||
    sampleCandidates[0];
  const getStatusLabel = (status: Candidate["status"]) => {
    if (status === "Passed") return t("landing.aiScreening.statusPassed");
    if (status === "Review") return t("landing.aiScreening.statusReview");
    return t("landing.aiScreening.statusRejected");
  };

  return (
    <section id="ai-screening" className="w-full px-6 md:px-36 py-16 lg:py-0 lg:min-h-screen lg:flex lg:items-center bg-transparent relative z-10">
      <div className="w-full mx-auto">
        {/* Layout Flex Container */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-10 w-full">
          {/* Left Column: interactive HR dashboard preview */}
          <div className="w-full lg:w-[768px] lg:flex-shrink-0 flex lg:justify-start justify-center order-2 lg:order-1">
            <div className="w-full rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/85 dark:bg-zinc-900/40 backdrop-blur-md p-6 shadow-md dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-6 relative overflow-hidden lg:h-[580px]">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between border-b border-border/60 dark:border-white/5 pb-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("landing.aiScreening.pipeline")}</span>
                  <h5 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    {t("landing.aiScreening.dashboardTitle")}
                    <span className="text-[9px] font-medium text-muted-foreground bg-muted dark:bg-white/5 px-2 py-0.5 rounded-full">{t("landing.aiScreening.resumeCount")}</span>
                  </h5>
                </div>
              </div>

              {/* Content Area - Split Pane on Desktop, Stack/Slide on Mobile */}
              <div className="relative flex-1 min-h-0 lg:grid lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Left Pane: Candidate List */}
                <div className={`lg:col-span-5 flex flex-col gap-2.5 lg:overflow-y-auto lg:pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isMobileDetailOpen ? 'hidden lg:flex' : 'flex'}`}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">{t("landing.aiScreening.candidateList")}</span>
                  <div className="flex flex-col gap-2.5">
                    {sampleCandidates.map((candidate) => {
                      const isActive = candidate.id === selectedId;
                      return (
                        <button
                          key={candidate.id}
                          onClick={() => {
                            setSelectedId(candidate.id);
                            setIsMobileDetailOpen(true);
                          }}
                          className={`w-full text-left flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 relative group/item cursor-pointer ${
                            isActive 
                              ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/[0.03] shadow-sm" 
                              : "border-border/60 dark:border-white/5 bg-background/50 dark:bg-zinc-950/20 hover:border-border dark:hover:border-white/10 hover:bg-muted/50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center transition-colors duration-300 ${
                              isActive ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : "bg-muted dark:bg-zinc-800 text-foreground dark:text-zinc-300 border border-border/60 dark:border-white/5"
                            }`}>
                              {candidate.avatar}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400"}`}>{candidate.name}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">{t(candidate.roleKey)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{t("landing.aiScreening.match")}</span>
                              <span className={`text-xs font-extrabold ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground dark:text-zinc-200"}`}>{candidate.match}%</span>
                            </div>
                            <AltArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${isActive ? "translate-x-0.5 text-emerald-600 dark:text-emerald-400" : "group-hover/item:translate-x-0.5"}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pane: Selected Candidate Evaluation Detail */}
                <div className={`lg:col-span-7 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-border/60 dark:border-white/5 pt-5 lg:pt-0 lg:pl-6 lg:overflow-y-auto lg:pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${!isMobileDetailOpen ? 'hidden lg:flex' : 'flex'}`}>
                  
                  {/* Mobile Back Button */}
                  <div className="flex lg:hidden items-center justify-between border-b border-border/60 dark:border-white/5 pb-3">
                    <button 
                      onClick={() => setIsMobileDetailOpen(false)}
                      className="flex items-center gap-2 text-muted-foreground text-xs font-semibold hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t("landing.aiScreening.backToList")}
                    </button>
                    <span 
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                        selectedCandidate.status === "Passed" 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                          : selectedCandidate.status === "Review" 
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                          : "bg-muted text-muted-foreground border-border/60 dark:border-white/5"
                      }`}
                    >
                      {getStatusLabel(selectedCandidate.status)}
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedId}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col gap-5 flex-shrink-0"
                    >
                      {/* Candidate Detail Header */}
                      <div className="flex items-start justify-between gap-4 flex-shrink-0">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-base font-extrabold text-foreground">{selectedCandidate.name}</h4>
                            {/* Desktop Status Badge */}
                            <span 
                              className={`hidden lg:inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                                selectedCandidate.status === "Passed" 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                  : selectedCandidate.status === "Review" 
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                                  : "bg-muted text-muted-foreground border-border/60 dark:border-white/5"
                              }`}
                            >
                              {getStatusLabel(selectedCandidate.status)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{t(selectedCandidate.roleKey)} • {t("landing.aiScreening.culture")}: <span className="font-semibold text-foreground dark:text-zinc-200">{selectedCandidate.culture}</span></p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-zinc-950/40 border border-border/60 dark:border-white/5 px-3 py-1.5 rounded-2xl">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">{t("landing.aiScreening.aiScore")}</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedCandidate.match}<span className="text-muted-foreground text-[10px] font-normal">/100</span></span>
                          </div>
                        </div>
                      </div>

                      {/* AI Summary Comments */}
                      <div className="bg-emerald-500/[0.05] dark:bg-emerald-500/[0.02] border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                          {t("landing.aiScreening.aiSummary")}
                        </div>
                        <p className="text-[11px] md:text-xs text-foreground/90 dark:text-zinc-300 leading-relaxed font-medium">
                          &quot;{t(selectedCandidate.summaryKey)}&quot;
                        </p>
                      </div>

                      {/* Score Breakdown (Metrics) */}
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">{t("landing.aiScreening.skillDetails")}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedCandidate.details.map((detail, idx) => (
                            <div key={idx} className="bg-background/60 dark:bg-zinc-950/20 border border-border/60 dark:border-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-muted-foreground font-medium">{t(detail.labelKey)}</span>
                                <span className="font-bold text-foreground dark:text-zinc-200">{detail.value}%</span>
                              </div>
                              <Progress value={detail.value} className="h-1.5 bg-muted dark:bg-white/5" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Interview Highlights / Transcription Snippets */}
                      <div className="flex flex-col gap-3 flex-shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">{t("landing.aiScreening.interviewNotes")}</span>
                        <div className="flex flex-col gap-2">
                          {selectedCandidate.highlights.map((highlight, idx) => (
                            <div 
                              key={idx} 
                              className={`flex gap-2.5 p-3 rounded-xl border text-[11px] leading-relaxed ${
                                highlight.type === "positive" 
                                  ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.01] border-emerald-500/20 dark:border-emerald-500/10 text-emerald-800 dark:text-emerald-300/90" 
                                  : highlight.type === "negative" 
                                  ? "bg-rose-500/[0.05] dark:bg-rose-500/[0.01] border-rose-500/20 dark:border-rose-500/10 text-rose-800 dark:text-rose-300/90" 
                                  : "bg-muted/40 dark:bg-zinc-900/30 border-border/60 dark:border-white/5 text-foreground/80 dark:text-zinc-300"
                              }`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {highlight.type === "positive" ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full p-0.5" />
                                ) : highlight.type === "negative" ? (
                                  <span className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-full flex items-center justify-center text-[8px] font-bold">!</span>
                                ) : (
                                  <ClockCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <span>{t(highlight.textKey)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Title + Subtitle + Features Description */}
          <div className="w-full lg:flex-1 max-w-2xl lg:ml-auto flex flex-col gap-10 order-1 lg:order-2">
            
            {/* Header / Intro inside right column */}
            <div className="flex flex-col gap-4">
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wider uppercase">{t("landing.aiScreening.sectionEyebrow")}</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                {t("landing.aiScreening.sectionTitle")}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                {t("landing.aiScreening.sectionDescription")}
              </p>
            </div>

            {/* Features List */}
            <div className="flex flex-col gap-6">
              {/* Feature 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <UsersGroupRounded weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-foreground text-base md:text-lg">{t("landing.aiScreening.feature1Title")}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("landing.aiScreening.feature1Description")}
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Chart weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-foreground text-base md:text-lg">{t("landing.aiScreening.feature2Title")}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("landing.aiScreening.feature2Description")}
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck weight="BoldDuotone" className="w-7 h-7" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-bold text-foreground text-base md:text-lg">{t("landing.aiScreening.feature3Title")}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("landing.aiScreening.feature3Description")}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
