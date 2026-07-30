"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, Chart, Microphone, ShieldCheck, Suitcase, UsersGroupRounded } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const solutionTracks = [
  {
    title: "Ứng viên luyện phỏng vấn",
    desc: "Mô phỏng phỏng vấn voice AI theo vị trí, ngành nghề và cấp độ kinh nghiệm.",
    metric: "1-1",
    icon: Microphone,
    tint: "text-[var(--chart-1)]",
  },
  {
    title: "Doanh nghiệp sàng lọc",
    desc: "Tự động hóa vòng sơ loại, chuẩn hóa câu hỏi và báo cáo theo JD.",
    metric: "24/7",
    icon: Suitcase,
    tint: "text-emerald-400",
  },
  {
    title: "Đội ngũ đào tạo",
    desc: "Theo dõi tiến bộ, so sánh kết quả và hướng dẫn cải thiện qua từng phiên.",
    metric: "Score",
    icon: Chart,
    tint: "text-violet-300",
  },
];

const workflow = [
  "Nạp JD hoặc chọn ngành nghề",
  "AI tạo kịch bản hỏi đáp",
  "Phỏng vấn voice trực tiếp",
  "Nhận báo cáo điểm và gợi ý",
];

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="flex flex-col gap-24">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[540px]">
          <div className="lg:col-span-6 flex flex-col gap-7">
            <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Giải pháp InterV</span>
            <h1 className="text-[36px] sm:text-[48px] lg:text-[62px] font-extrabold leading-[1.06] tracking-normal">
              AI interview platform cho cả luyện tập và tuyển dụng
            </h1>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
              InterV gom toàn bộ hành trình phỏng vấn vào một nơi: chuẩn bị câu hỏi, đối thoại bằng giọng nói, đánh giá theo rubric và biến kết quả thành hành động tiếp theo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => router.push("/practice")} className="rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none px-7 py-5 h-auto">
                Bắt đầu luyện tập
                <AltArrowRight className="w-4 h-4" />
              </Button>
              <Button onClick={() => router.push("/contact-support")} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-bold px-7 py-5 h-auto">
                Tư vấn doanh nghiệp
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-white/[0.08] bg-zinc-950/50 backdrop-blur-md p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 rounded-2xl border border-[rgba(187,244,81,0.16)] bg-[var(--chart-1)]/[0.04] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Live interview engine</p>
                      <h2 className="mt-2 text-2xl font-black text-white">JD-aware voice AI</h2>
                    </div>
                    <ShieldCheck weight="BoldDuotone" className="w-12 h-12 text-[var(--chart-1)]" />
                  </div>
                  <div className="mt-8 grid grid-cols-4 gap-2">
                    {workflow.map((item, index) => (
                      <div key={item} className="rounded-xl bg-zinc-950/45 border border-white/5 p-3 min-h-24">
                        <span className="text-[var(--chart-1)] text-xs font-black">0{index + 1}</span>
                        <p className="mt-2 text-xs text-zinc-300 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-5">
                  <p className="text-4xl font-black text-white">90%</p>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">Quy trình sơ loại có thể tự động hóa bằng AI.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-5">
                  <p className="text-4xl font-black text-white">100</p>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">Thang điểm đánh giá rõ ràng cho từng buổi.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {solutionTracks.map((track) => {
            const Icon = track.icon;
            return (
              <article key={track.title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 backdrop-blur-md p-7 flex flex-col gap-8">
                <div className="flex items-start justify-between">
                  <Icon weight="BoldDuotone" className={`w-10 h-10 ${track.tint}`} />
                  <span className="text-2xl font-black text-white">{track.metric}</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">{track.title}</h2>
                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{track.desc}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="flex flex-col gap-4">
            <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Solution map</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">Một lõi AI, nhiều workflow phỏng vấn</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["Ứng viên tự luyện", "HR sàng lọc", "Manager review", "L&D theo dõi"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/[0.08] bg-zinc-950/35 p-5 text-sm font-bold text-zinc-200">
                <UsersGroupRounded className="mb-4 w-6 h-6 text-[var(--chart-1)]" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
