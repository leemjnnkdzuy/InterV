"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, ChatSquareCode, Library, Microphone, QuestionCircle } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const groups = [
  { title: "Behavioral", count: "40+", icon: QuestionCircle, text: "Câu hỏi hành vi, teamwork, conflict và leadership." },
  { title: "Technical", count: "60+", icon: ChatSquareCode, text: "Kiến thức chuyên môn, system design và xử lý tình huống." },
  { title: "Communication", count: "30+", icon: Microphone, text: "Rèn cách trình bày, tốc độ nói và cấu trúc câu trả lời." },
];

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="flex flex-col gap-20">
        <section className="text-center max-w-4xl mx-auto min-h-[420px] flex flex-col items-center justify-center gap-6">
          <Library weight="BoldDuotone" className="w-16 h-16 text-[var(--chart-1)]" />
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Ngân hàng câu hỏi</span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[60px] font-extrabold leading-[1.07]">Luyện câu trả lời theo nhóm kỹ năng</h1>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
            Không học thuộc từng câu. InterV giúp bạn luyện cách tư duy, cấu trúc và phản xạ nói trước nhiều dạng câu hỏi.
          </p>
          <Button onClick={() => router.push("/practice")} className="rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none px-7 py-5 h-auto">
            Luyện bằng AI
            <AltArrowRight className="w-4 h-4" />
          </Button>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-7 min-h-72 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Icon weight="BoldDuotone" className="w-10 h-10 text-[var(--chart-1)]" />
                  <span className="text-3xl font-black text-white">{group.count}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">{group.title}</h2>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{group.text}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/40 p-8 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {["Situation", "Task", "Action", "Result"].map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-5">
              <span className="text-[var(--chart-1)] text-xs font-black">0{index + 1}</span>
              <h3 className="mt-4 text-lg font-extrabold text-white">{step}</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">Khung luyện STAR giúp câu trả lời rõ ý và có bằng chứng.</p>
            </div>
          ))}
        </section>
      </div>
    </MarketingShell>
  );
}
