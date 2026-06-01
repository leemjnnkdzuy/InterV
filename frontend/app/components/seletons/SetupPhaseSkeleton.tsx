"use client";

import React from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Card } from "@/app/components/ui/card";

export default function SetupPhaseSkeleton() {
  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
      {/* Top back button row */}
      <div className="w-full px-6 pt-6 pb-2 flex items-center justify-between shrink-0 select-none">
        <Skeleton className="h-10 w-28 rounded-full" />
        <h1 className="font-logo text-xl font-bold tracking-tight text-foreground select-none">
          InterV<span className="text-[var(--chart-1)]">.</span>
        </h1>
      </div>

      {/* Main setup layout workspace */}
      <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto no-scrollbar gap-6">
        {/* Bento Grid layout */}
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* Column 1: Metadata (Title, Industry), JD Loader & Focus Topics */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-[500px]">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[32px] overflow-hidden shadow-sm flex flex-col justify-between p-6 gap-6">
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                {/* Title & Industry Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border/10 shrink-0">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-[42px] w-full rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-[42px] w-full rounded-2xl" />
                  </div>
                </div>

                {/* Section Title & Tabs */}
                <div className="flex items-center justify-between border-b border-border/10 pb-3 shrink-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-40 rounded-xl" />
                </div>

                {/* JD Loader area */}
                <div className="flex-1 flex flex-col justify-center min-h-[140px]">
                  <Skeleton className="h-full min-h-[140px] w-full rounded-3xl" />
                </div>
              </div>

              {/* Topic Area at bottom */}
              <div className="space-y-2 pt-4 border-t border-border/10 shrink-0">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-[50px] w-full rounded-2xl" />
              </div>
            </Card>
          </div>

          {/* Column 2: Parameters Configuration */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-[500px]">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col gap-6 justify-between">
              <div className="border-b border-border/10 pb-3 shrink-0">
                <Skeleton className="h-4 w-36" />
              </div>

              <div className="flex-1 flex flex-col gap-6 min-h-0">
                {/* Difficulty levels */}
                <div className="space-y-3">
                  <Skeleton className="h-3 w-32" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-[54px] w-full rounded-xl" />
                    <Skeleton className="h-[54px] w-full rounded-xl" />
                    <Skeleton className="h-[54px] w-full rounded-xl" />
                  </div>
                </div>

                {/* Duration options */}
                <div className="space-y-3 pt-4 border-t border-border/10">
                  <Skeleton className="h-3 w-32" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-[54px] w-full rounded-xl" />
                    <Skeleton className="h-[54px] w-full rounded-xl" />
                    <Skeleton className="h-[54px] w-full rounded-xl" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Column 3: AI Interviewer & Submit */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-[500px]">
            <Card className="flex-1 border border-border/10 bg-card/15 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col gap-5 justify-between overflow-hidden">
              <div className="border-b border-border/10 pb-3 shrink-0">
                <Skeleton className="h-4 w-32" />
              </div>

              {/* AI List */}
              <div className="flex-1 space-y-3 overflow-hidden">
                <Skeleton className="h-[74px] w-full rounded-2xl" />
                <Skeleton className="h-[74px] w-full rounded-2xl" />
                <Skeleton className="h-[74px] w-full rounded-2xl" />
                <Skeleton className="h-[74px] w-full rounded-2xl" />
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-border/10 shrink-0">
                <Skeleton className="h-[50px] w-full rounded-2xl" />
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
