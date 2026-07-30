"use client";

import React from "react";
import { Chart, CheckCircle, MedalStar, UsersGroupRounded } from "@solar-icons/react";
import MarketingShell from "@/app/components/common/MarketingShell";

const candidates = [
  { name: "Nguyễn Văn An", role: "Product Designer", score: 92, status: "Ưu tiên" },
  { name: "Trần Thị Minh", role: "UX Researcher", score: 87, status: "Review" },
  { name: "Phạm Minh Đức", role: "UI Designer", score: 62, status: "Chưa phù hợp" },
];

export default function Page() {
  return (
    <MarketingShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <section className="lg:col-span-5 flex flex-col gap-6">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Đánh giá & xếp hạng</span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.07]">Biến câu trả lời thành bảng ưu tiên tuyển dụng</h1>
          <p className="text-zinc-400 leading-relaxed">InterV kết hợp điểm số, nhận xét định tính và tín hiệu nổi bật để HR scan nhanh nhưng vẫn có dữ kiện khi cần đào sâu.</p>
          <div className="grid grid-cols-3 gap-3">
            {["/100", "Rubric", "Rank"].map((item) => <div key={item} className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4 text-center text-xl font-black text-white">{item}</div>)}
          </div>
        </section>
        <section className="lg:col-span-7 rounded-3xl border border-white/[0.08] bg-zinc-950/45 p-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div><p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Hiring dashboard</p><h2 className="mt-1 text-xl font-black text-white">Shortlist vòng 1</h2></div>
            <MedalStar weight="BoldDuotone" className="w-10 h-10 text-[var(--chart-1)]" />
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {candidates.map((candidate) => (
              <div key={candidate.name} className="rounded-2xl border border-white/[0.08] bg-zinc-900/45 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center font-black">{candidate.name[0]}</div>
                  <div><h3 className="text-sm font-extrabold text-white">{candidate.name}</h3><p className="text-xs text-zinc-400">{candidate.role}</p></div>
                </div>
                <div className="text-right"><p className="text-xl font-black text-white">{candidate.score}</p><p className="text-xs text-zinc-500">{candidate.status}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-7"><Chart className="w-9 h-9 text-[var(--chart-1)]" /><h2 className="mt-7 text-xl font-extrabold text-white">Điểm theo tiêu chí</h2><p className="mt-3 text-sm text-zinc-400">Tách từng năng lực để tránh một điểm tổng quá mơ hồ.</p></div>
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-7"><CheckCircle className="w-9 h-9 text-emerald-400" /><h2 className="mt-7 text-xl font-extrabold text-white">Nhận xét có bằng chứng</h2><p className="mt-3 text-sm text-zinc-400">Feedback dựa trên nội dung câu trả lời của ứng viên.</p></div>
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-7"><UsersGroupRounded className="w-9 h-9 text-violet-300" /><h2 className="mt-7 text-xl font-extrabold text-white">So sánh ứng viên</h2><p className="mt-3 text-sm text-zinc-400">Giúp hiring team thống nhất người nên đi tiếp.</p></div>
        </section>
      </div>
    </MarketingShell>
  );
}
