"use client";

import React from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import SilkBackground from "@/app/components/common/SilkBackground";

export default function InterviewAnalysisSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SilkBackground fadeBottom bottomColor="var(--background)" />

      {/* Ambient background glow orbs */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 right-10 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-9 space-y-10">
        {/* =========================================================================
            1. HEADER SECTION SKELETON
           ========================================================================= */}
        <header className="flex flex-wrap items-start justify-between gap-6 pb-8 border-b border-border/60">
          <div className="space-y-3">
            {/* Back link pill */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>

            {/* Main Page Title */}
            <Skeleton className="h-9 w-72 sm:w-96 rounded-xl" />

            {/* Metadata Pills / Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Skeleton className="h-5 w-44 rounded-md" />
              <span className="text-muted-foreground/30">•</span>
              <Skeleton className="h-5 w-24 rounded-md" />
              <span className="text-muted-foreground/30">•</span>
              <Skeleton className="h-5 w-36 rounded-md" />
            </div>
          </div>

          {/* Action Button on Top-Right */}
          <Skeleton className="h-11 w-36 sm:w-40 rounded-2xl shrink-0 shadow-sm" />
        </header>

        {/* =========================================================================
            2. OVERALL SCORE & COMPETENCY RATINGS BENTO SKELETON
           ========================================================================= */}
        <section className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl p-6 md:p-8 shadow-xl shadow-black/5">
          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            {/* Left: Giant Overall Score Column */}
            <div className="flex flex-col items-center justify-center border-b border-border/50 pb-8 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-8 space-y-3">
              <Skeleton className="h-3.5 w-24 rounded-full" />
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-20 w-28 rounded-3xl" />
              </div>
              <Skeleton className="h-3.5 w-12 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-full mt-2" />
            </div>

            {/* Right: 7 Competency Rating Progress Bars */}
            <div className="space-y-5 lg:pl-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-5 w-5 rounded-lg" />
                <Skeleton className="h-5 w-44 rounded-md" />
              </div>

              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {[
                  { labelWidth: "w-28", valWidth: "w-8", barWidth: "w-[85%]" },
                  { labelWidth: "w-36", valWidth: "w-8", barWidth: "w-[78%]" },
                  { labelWidth: "w-32", valWidth: "w-8", barWidth: "w-[92%]" },
                  { labelWidth: "w-36", valWidth: "w-8", barWidth: "w-[70%]" },
                  { labelWidth: "w-24", valWidth: "w-8", barWidth: "w-[88%]" },
                  { labelWidth: "w-32", valWidth: "w-8", barWidth: "w-[82%]" },
                  { labelWidth: "w-40", valWidth: "w-8", barWidth: "w-[75%]" },
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className={`h-3.5 ${item.labelWidth} rounded-md`} />
                      <Skeleton className={`h-3.5 ${item.valWidth} rounded-md`} />
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <Skeleton className={`h-full ${item.barWidth} rounded-full`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. EXECUTIVE SUMMARY & 4 CATEGORY FEEDBACK CARDS
           ========================================================================= */}
        <section className="space-y-6 pt-2">
          <div className="space-y-3">
            <Skeleton className="h-6 w-44 rounded-lg" />
            {/* Realistic multiline executive summary */}
            <div className="space-y-2 max-w-4xl pt-1">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-[95%] rounded-md" />
              <Skeleton className="h-4 w-[80%] rounded-md" />
            </div>
          </div>

          {/* 4 Themed Feedback Cards */}
          <div className="space-y-4 pt-2">
            {[
              {
                borderClass: "border-emerald-500/20 bg-emerald-500/[0.02]",
                titleWidth: "w-32",
                lines: ["w-[92%]", "w-[84%]"],
              },
              {
                borderClass: "border-amber-500/20 bg-amber-500/[0.02]",
                titleWidth: "w-36",
                lines: ["w-[88%]", "w-[76%]"],
              },
              {
                borderClass: "border-rose-500/20 bg-rose-500/[0.02]",
                titleWidth: "w-28",
                lines: ["w-[90%]", "w-[65%]"],
              },
              {
                borderClass: "border-primary/20 bg-primary/[0.02]",
                titleWidth: "w-40",
                lines: ["w-[94%]", "w-[85%]"],
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`rounded-2xl border ${card.borderClass} p-5 backdrop-blur-md md:grid md:grid-cols-[200px_1fr] md:gap-6 md:items-start`}
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-5 rounded-lg shrink-0" />
                  <Skeleton className={`h-4 ${card.titleWidth} rounded-md`} />
                </div>
                <div className="mt-3 md:mt-0 space-y-2.5">
                  {card.lines.map((lineWidth, lineIdx) => (
                    <div key={lineIdx} className="flex items-start gap-2.5">
                      <Skeleton className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" />
                      <Skeleton className={`h-3.5 ${lineWidth} rounded-md`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            4. VOCAL & SPEECH DELIVERY METRICS SKELETON
           ========================================================================= */}
        <section className="space-y-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 rounded-lg" />
            <Skeleton className="h-6 w-60 rounded-lg" />
          </div>

          {/* 6 Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "w-24", val: "w-28", note: "w-44" },
              { label: "w-32", val: "w-20", note: "w-48" },
              { label: "w-24", val: "w-16", note: "w-40" },
              { label: "w-32", val: "w-20", note: "w-44" },
              { label: "w-20", val: "w-16", note: "w-36" },
              { label: "w-36", val: "w-24", note: "w-48" },
            ].map((metric, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 bg-card/25 p-4 backdrop-blur-md space-y-2 border-l-4 border-l-primary/40"
              >
                <Skeleton className={`h-3 ${metric.label} rounded-md`} />
                <Skeleton className={`h-6 ${metric.val} rounded-lg`} />
                <Skeleton className={`h-3 ${metric.note} rounded-md`} />
              </div>
            ))}
          </div>

          {/* 2-Column Audio Observations vs Next-Trial Recommendations */}
          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <div className="rounded-2xl border border-border/40 bg-card/20 p-5 space-y-3">
              <Skeleton className="h-4 w-36 rounded-md" />
              <div className="space-y-2.5">
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-[90%] rounded-md" />
                <Skeleton className="h-3.5 w-[80%] rounded-md" />
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/20 p-5 space-y-3">
              <Skeleton className="h-4 w-44 rounded-md" />
              <div className="space-y-2.5">
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-3.5 w-[85%] rounded-md" />
                <Skeleton className="h-3.5 w-[75%] rounded-md" />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. QUESTION BY QUESTION DETAILED REVIEW SKELETON
           ========================================================================= */}
        <section className="space-y-6 pt-4 border-t border-border/50 pb-16">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 rounded-lg" />
            <Skeleton className="h-6 w-52 rounded-lg" />
          </div>

          <div className="space-y-5">
            {[
              { qLen: "w-[85%]", ansLen: "w-[92%]", fbLen: "w-[88%]" },
              { qLen: "w-[75%]", ansLen: "w-[85%]", fbLen: "w-[90%]" },
              { qLen: "w-[80%]", ansLen: "w-[95%]", fbLen: "w-[82%]" },
            ].map((q, idx) => (
              <article
                key={idx}
                className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-md space-y-4 shadow-sm"
              >
                {/* Question Header: Title & Score Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5 flex-1">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <Skeleton className={`h-5 ${q.qLen} rounded-md`} />
                  </div>
                  <Skeleton className="h-7 w-12 rounded-xl shrink-0" />
                </div>

                {/* Candidate Answer Box */}
                <div className="rounded-xl border border-border/30 bg-muted/20 p-3.5 space-y-2">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className={`h-3.5 ${q.ansLen} rounded-md`} />
                </div>

                {/* AI Feedback & Assessment Divider */}
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className={`h-3.5 ${q.fbLen} rounded-md`} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

