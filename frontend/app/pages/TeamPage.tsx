"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, Code, PenNewRound, Star, Suitcase, UserSpeak, UsersGroupRounded } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const members = [
  { name: "Product Lab", role: "Thiết kế trải nghiệm luyện tập", initial: "P", accent: "bg-[var(--chart-1)] text-zinc-950" },
  { name: "AI Evaluation", role: "Rubric, scoring và feedback", initial: "A", accent: "bg-emerald-500 text-white" },
  { name: "Talent Ops", role: "Quy trình HR và sàng lọc", initial: "T", accent: "bg-violet-500 text-white" },
  { name: "Platform", role: "Hạ tầng, bảo mật và dữ liệu", initial: "D", accent: "bg-zinc-100 text-zinc-950" },
];

const principles = [
  { icon: UserSpeak, title: "Lắng nghe người luyện tập", text: "Feedback phải giúp người dùng biết sửa gì ở lần tiếp theo." },
  { icon: Suitcase, title: "Hiểu nhịp tuyển dụng", text: "Báo cáo phải đủ nhanh cho HR nhưng vẫn đủ sâu cho hiring manager." },
  { icon: Code, title: "AI có trách nhiệm", text: "AI hỗ trợ đánh giá, còn quyết định cuối cùng luôn thuộc về con người." },
];

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="flex flex-col gap-24">
        <section className="min-h-[560px] flex flex-col justify-center gap-12">
          <div className="max-w-4xl">
            <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Đội ngũ InterV</span>
            <h1 className="mt-5 text-[36px] sm:text-[48px] lg:text-[64px] font-extrabold leading-[1.06] tracking-normal">
              Những người đang làm phỏng vấn bớt mơ hồ và công bằng hơn
            </h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 rounded-3xl border border-white/[0.08] bg-zinc-950/45 backdrop-blur-md p-8">
              <PenNewRound weight="BoldDuotone" className="w-12 h-12 text-[var(--chart-1)]" />
              <p className="mt-8 text-lg text-zinc-300 leading-relaxed">
                InterV được xây bởi nhóm kết hợp sản phẩm, AI và tuyển dụng. Chúng tôi quan tâm đến trải nghiệm nhỏ: một câu hỏi đúng lúc, một nhận xét đủ rõ, một báo cáo giúp người dùng tiến lên.
              </p>
              <Button onClick={() => router.push("/solutions")} className="mt-8 rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none px-7 py-5 h-auto">
                Xem giải pháp
                <AltArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {members.map((member) => (
                <article key={member.name} className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6 flex flex-col justify-between min-h-52">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${member.accent}`}>
                    {member.initial}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">{member.name}</h2>
                    <p className="mt-2 text-sm text-zinc-400">{member.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-3xl border border-white/[0.08] bg-zinc-950/35 p-7">
                <Icon weight="BoldDuotone" className="w-10 h-10 text-emerald-400" />
                <h2 className="mt-8 text-lg font-extrabold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-[rgba(187,244,81,0.16)] bg-[var(--chart-1)]/[0.04] p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2">
            <UsersGroupRounded weight="BoldDuotone" className="w-12 h-12 text-[var(--chart-1)]" />
            <h2 className="mt-6 text-3xl md:text-4xl font-extrabold text-white">Chúng tôi xây InterV như một người đồng hành luyện tập</h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6">
            <Star weight="BoldDuotone" className="w-8 h-8 text-[var(--chart-1)]" />
            <p className="mt-5 text-sm leading-relaxed text-zinc-300">Tập trung vào sự rõ ràng, tốc độ phản hồi và cảm giác tự tin sau mỗi lần luyện phỏng vấn.</p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
