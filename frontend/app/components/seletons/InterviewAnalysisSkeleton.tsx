"use client";

import React from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import SilkBackground from "@/app/components/common/SilkBackground";

export default function InterviewAnalysisSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SilkBackground fadeBottom bottomColor="var(--background)" />
      
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-9 space-y-8">
        {/* Header Skeleton */}
        <header className="flex flex-wrap items-start justify-between gap-4 pb-8 border-b border-border/60">
          <div className="space-y-3">
            {/* Back link */}
            <Skeleton className="h-4 w-28 rounded-md" />
            {/* Page title */}
            <Skeleton className="h-8 w-64 md:w-80 rounded-lg" />
            {/* Subtitle / metadata */}
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>

          {/* Practice again action button */}
          <Skeleton className="h-11 w-36 rounded-xl shrink-0" />
        </header>

        {/* Score & Rating Breakdown Bento */}
        <section className="grid gap-8 border-b border-border/60 pb-8 lg:grid-cols-[240px_1fr]">
          {/* Left: Overall Score Column */}
          <div className="flex flex-col items-center justify-center border-b border-border/60 pb-8 lg:border-r lg:border-b-0 lg:pb-0 space-y-3">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-20 w-32 rounded-3xl" />
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>

          {/* Right: Skills & Ratings Progress Rows */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-5 w-36 rounded-md" />
            </div>

            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-3.5 w-8 rounded-md" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Executive Summary & Feedback */}
        <section className="border-b border-border/60 pb-8 space-y-6">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="space-y-2 max-w-4xl">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-[92%] rounded-md" />
            <Skeleton className="h-4 w-[78%] rounded-md" />
          </div>

          {/* 4 Feedback Cards (Strengths, Weaknesses, Mistakes, Recommendations) */}
          <div className="space-y-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm md:grid md:grid-cols-[200px_1fr] md:gap-6 md:items-start"
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
                <div className="mt-3 md:mt-0 space-y-2">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-[85%] rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Vocal & Speech Delivery Metrics */}
        <section className="border-b border-border/60 pb-8 space-y-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-48 rounded-md" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-l-2 border-primary/40 pl-3.5 space-y-2 py-1"
              >
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-6 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        {/* Question by Question Review */}
        <section className="space-y-5 pb-12">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-5 w-44 rounded-md" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <Skeleton className="h-5 w-[75%] rounded-md" />
                  <Skeleton className="h-6 w-12 rounded-lg shrink-0" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-[88%] rounded-md" />
                </div>
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <Skeleton className="h-3.5 w-[94%] rounded-md" />
                  <Skeleton className="h-3.5 w-[70%] rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
