"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, ClockCircle, DocumentText, Microphone, ShieldCheck } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const timeline = [
  { time: "00:00", title: "Xác thực phiên", text: "Ứng viên vào phòng phỏng vấn và kiểm tra micro." },
  { time: "02:00", title: "AI mở đầu", text: "AI giới thiệu ngữ cảnh, vị trí và cấu trúc buổi hỏi đáp." },
  { time: "15:00", title: "Hỏi sâu theo JD", text: "Câu hỏi nối tiếp dựa trên câu trả lời và kỹ năng cần kiểm tra." },
  { time: "Sau phiên", title: "Tổng hợp báo cáo", text: "Hệ thống trả về score, nhận xét và ghi chú bất thường." },
];

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="flex flex-col gap-20">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[540px]">
          <div className="flex flex-col gap-6">
            <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Tự động hóa phỏng vấn</span>
            <h1 className="text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.07]">Phỏng vấn vòng đầu chạy tự động từ đầu đến cuối</h1>
            <p className="text-zinc-400 text-base leading-relaxed">AI thay HR thực hiện cuộc gọi phỏng vấn sơ loại, giữ kịch bản bám JD nhưng vẫn phản hồi linh hoạt theo câu trả lời.</p>
            <Button onClick={() => router.push("/contact-support")} className="w-fit rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none px-7 py-5 h-auto">
              Thiết lập demo
              <AltArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-950/45 p-6">
            <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.08] p-5">
              <div className="flex items-center justify-between">
                <Microphone weight="BoldDuotone" className="w-12 h-12 text-emerald-400" />
                <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">Live</span>
              </div>
              <div className="mt-10 flex items-end gap-2 h-32">
                {[36, 70, 44, 92, 58, 82, 48, 76, 40, 88].map((height, index) => (
                  <div key={index} className="flex-1 rounded-full bg-[var(--chart-1)]/70" style={{ height }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {timeline.map((item) => (
            <article key={item.time} className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6">
              <ClockCircle className="w-7 h-7 text-[var(--chart-1)]" />
              <p className="mt-5 text-xs font-black text-zinc-500">{item.time}</p>
              <h2 className="mt-2 text-lg font-extrabold text-white">{item.title}</h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-950/35 p-7"><DocumentText weight="BoldDuotone" className="w-10 h-10 text-[var(--chart-1)]" /><h2 className="mt-6 text-xl font-extrabold text-white">Bám sát JD</h2><p className="mt-3 text-sm text-zinc-400">Câu hỏi được cá nhân hóa theo mô tả công việc.</p></div>
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-950/35 p-7"><ShieldCheck weight="BoldDuotone" className="w-10 h-10 text-emerald-400" /><h2 className="mt-6 text-xl font-extrabold text-white">Ghi nhận tín hiệu</h2><p className="mt-3 text-sm text-zinc-400">Lưu dấu hiệu cần HR kiểm tra lại trước quyết định.</p></div>
        </section>
      </div>
    </MarketingShell>
  );
}
