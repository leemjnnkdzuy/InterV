"use client";

import React from "react";
import SilkBackground from "@/app/components/common/SilkBackground";
import { Footer, Header } from "@/app/components/common/LandingPage";

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dark w-full min-h-screen bg-[var(--marketing-page-bg)] text-zinc-100 flex flex-col relative overflow-x-clip font-sans"
      style={{ "--marketing-page-bg": "#08080a" } as React.CSSProperties}
    >
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--chart-1)]/15 blur-[130px]" />
        <div className="absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-[var(--chart-3)]/6 blur-[150px]" />
      </div>
      <div className="relative flex flex-col flex-1 z-10">
        <div className="absolute inset-x-0 top-0 h-[96svh] z-0">
          <SilkBackground fadeBottom bottomColor="var(--marketing-page-bg)" />
        </div>
        <Header />
        <main className="relative z-10 w-full px-6 sm:px-12 md:px-36 pt-36 pb-24">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
