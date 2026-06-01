"use client";

import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/app/components/ui/drawer";
import { Button } from "@/app/components/ui/button";
import { 
  MedalStar, 
  ChatRound, 
  Lightbulb, 
  Stars, 
  CheckCircle, 
  ClockCircle, 
  Lightning,
  Pulse
} from "@solar-icons/react";
import type { ResultPracticeDrawerProps } from "@/app/types";

export default function ResultPracticeDrawer({
  isOpen,
  onOpenChange,
  title,
  resultData,
}: ResultPracticeDrawerProps) {
  if (!resultData) return null;

  const { score, duration, feedback, ratings, questions, createdAt } = resultData;

  // Circular progress math
  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Helper to determine rating tier
  const getRatingTier = (val: number) => {
    if (val >= 90) return { label: "Xuáº¥t sáº¯c", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (val >= 80) return { label: "Ráº¥t tá»‘t", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    if (val >= 65) return { label: "KhÃ¡", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    return { label: "Cáº§n cáº£i thiá»‡n", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  };

  const tier = getRatingTier(score);

  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} lÃºc ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-none w-full p-0 rounded-t-[32px] border-t border-border/10 bg-background/95 backdrop-blur-xl before:hidden overflow-hidden shadow-2xl">
        <div className="w-full px-6 pt-4 pb-6 flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar">
          
          {/* Header */}
          <DrawerHeader className="px-0 pt-2 pb-4 text-left border-b border-border/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DrawerTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <MedalStar className="w-6 h-6 text-primary" />
                  BÃ¡o cÃ¡o káº¿t quáº£ phá»ng váº¥n AI
                </DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground mt-1">
                  {title} â€¢ ÄÃ£ thá»±c hiá»‡n ngÃ y {formatDateTime(createdAt)}
                </DrawerDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground bg-card/40 border border-border/20 rounded-2xl px-4 py-2 w-fit">
                <span className="flex items-center gap-1.5"><ClockCircle className="w-3.5 h-3.5 text-primary" />{duration}</span>
                <span className="h-3 w-px bg-border/40" />
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />{questions?.length || 0} cÃ¢u há»i</span>
              </div>
            </div>
          </DrawerHeader>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 text-left">
            
            {/* Left Box: Score Ring & Sub-Scores */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 border border-border/20 rounded-3xl bg-card/25 backdrop-blur-sm shadow-sm">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Äiá»ƒm tá»•ng quÃ¡t</span>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full rotate-[-90deg]">
                  {/* Background Track */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-muted/15"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  {/* Active Progress */}
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-primary transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-foreground tracking-tight">{score}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">trÃªn 100</span>
                </div>
              </div>

              <div className={`mt-4 px-3 py-1 rounded-full text-xs font-black border ${tier.bg} ${tier.color} ${tier.border} animate-pulse`}>
                {tier.label}
              </div>
            </div>

            {/* Middle/Right Box: Ratings & AI General Feedback */}
            <div className="md:col-span-8 flex flex-col justify-between gap-5">
              
              {/* Ratings progress */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ÄÃ¡nh giÃ¡ cÃ¡c khÃ­a cáº¡nh</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Communication */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-card/15 border border-border/10">
                    <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5"><ChatRound className="w-3.5 h-3.5 text-blue-500" /> Giao tiáº¿p & á»¨ng xá»­</span>
                      <span className="font-bold">{ratings.communication}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${ratings.communication}%` }} />
                    </div>
                  </div>

                  {/* Technical Knowledge */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-card/15 border border-border/10">
                    <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-purple-500" /> Kiáº¿n thá»©c chuyÃªn mÃ´n</span>
                      <span className="font-bold">{ratings.knowledge}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${ratings.knowledge}%` }} />
                    </div>
                  </div>

                  {/* Problem Solving */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-card/15 border border-border/10">
                    <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5"><Lightning className="w-3.5 h-3.5 text-amber-500" /> Giáº£i quyáº¿t váº¥n Ä‘á»</span>
                      <span className="font-bold">{ratings.problemSolving}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${ratings.problemSolving}%` }} />
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-card/15 border border-border/10">
                    <div className="flex justify-between items-center text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-1.5"><Stars className="w-3.5 h-3.5 text-emerald-500" /> Sá»± tá»± tin</span>
                      <span className="font-bold">{ratings.confidence}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${ratings.confidence}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* General Feedback Box */}
              <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden flex-1 flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -z-10" />
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Pulse className="w-4 h-4" />
                  ÄÃ¡nh giÃ¡ chung cá»§a AI
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {feedback}
                </p>
              </div>

            </div>
          </div>

          {/* Details Q&A Accordion/List */}
          <div className="mt-2 text-left space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chi tiáº¿t cÃ¡c cÃ¢u há»i & Tráº£ lá»i</h4>
            
            <div className="space-y-4">
              {questions && questions.map((q, idx) => {
                const qTier = getRatingTier(q.score);
                return (
                  <div key={idx} className="border border-border/15 rounded-3xl bg-card/5 overflow-hidden">
                    {/* Collapsible header styling */}
                    <div className="p-4 bg-muted/10 border-b border-border/10 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-primary uppercase">CÃ¢u há»i {idx + 1}</span>
                        <h5 className="text-xs font-bold text-foreground leading-snug">{q.question}</h5>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${qTier.bg} ${qTier.color} ${qTier.border}`}>
                        {q.score} Ä‘iá»ƒm
                      </div>
                    </div>
                    
                    {/* Body content */}
                    <div className="p-4 space-y-3.5 text-xs">
                      {/* User's Answer */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">CÃ¢u tráº£ lá»i cá»§a báº¡n:</span>
                        <div className="p-3 bg-muted/20 border border-border/5 rounded-2xl text-muted-foreground font-medium italic">
                          &quot;{q.answer || "KhÃ´ng cÃ³ cÃ¢u tráº£ lá»i."}&quot;
                        </div>
                      </div>

                      {/* AI Feedback */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase">PhÃ¢n tÃ­ch & ÄÃ¡nh giÃ¡ tá»« AI:</span>
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-foreground font-medium">
                          {q.feedback}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer action buttons */}
          <DrawerFooter className="px-0 pt-6 mt-4 border-t border-border/20 flex flex-row gap-3">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 rounded-2xl py-5 text-xs font-semibold cursor-pointer">
                ÄÃ³ng bÃ¡o cÃ¡o
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
