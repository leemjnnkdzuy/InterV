"use client";

import React from "react";
import { Button } from "@/app/components/ui/button";
import { Suitcase, SquareAcademicCap, AltArrowRight } from "@solar-icons/react";

export default function WhoIsThisFor() {
  return (
    <section id="who-is-this-for" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Nền tảng này dành cho ai?
          </h2>
          <p className="text-zinc-400 text-base md:text-lg">
            Dù bạn là ứng viên đang tìm kiếm cơ hội đột phá hay doanh nghiệp mong muốn tối ưu nhân sự, InterV đều có giải pháp tối ưu cho bạn.
          </p>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          
          {/* Candidate Card (B2C) */}
          <div
            className="group relative rounded-3xl border border-white/[0.08] hover:border-[rgba(187,244,81,0.2)] hover:shadow-[0_20px_40px_rgba(187,244,81,0.05)] bg-zinc-900/50 backdrop-blur-md p-8 md:p-10 flex flex-col justify-between gap-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300"
          >
            {/* Visual background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[var(--chart-1)]/5 blur-3xl group-hover:bg-[var(--chart-1)]/10 transition-colors" />
            
            <div className="flex flex-col gap-6 z-10">
              <div className="w-12 h-12 flex items-center justify-center text-[var(--chart-1)]">
                <SquareAcademicCap weight="BoldDuotone" className="w-11 h-11" />
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Dành cho Ứng viên</span>
                <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
                  Bạn muốn tự tin vượt qua mọi buổi phỏng vấn?
                </h3>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                  Luyện tập 1-1 không giới hạn với AI mô phỏng đúng ngữ cảnh ngành nghề của bạn. Nhận đánh giá tức thì về từ vựng, tốc độ nói, độ trôi chảy và phong thái diễn đạt.
                </p>
              </div>
            </div>

            <Button className="w-full sm:w-fit rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-6 py-4 h-auto text-sm transition-colors flex items-center gap-2 group/btn z-10 mt-4 border-none shadow-[0_4px_20px_rgba(187,244,81,0.15)]">
              Luyện tập ngay
              <AltArrowRight className="w-4 h-4 text-zinc-700 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Employer Card (B2B) */}
          <div
            className="group relative rounded-3xl border border-white/[0.08] hover:border-[rgba(16,185,129,0.2)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.05)] bg-zinc-900/50 backdrop-blur-md p-8 md:p-10 flex flex-col justify-between gap-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300"
          >
            {/* Visual background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors" />

            <div className="flex flex-col gap-6 z-10">
              <div className="w-12 h-12 flex items-center justify-center text-emerald-400">
                <Suitcase weight="BoldDuotone" className="w-11 h-11" />
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Dành cho Doanh nghiệp</span>
                <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
                  Bạn muốn tối ưu quy trình sàng lọc ứng viên?
                </h3>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                  Tự động hóa vòng phỏng vấn sơ loại qua video/audio AI. Phân tích độ tương thích văn hóa, năng lực chuyên môn và xuất báo cáo điểm số tự động để lọc nhanh 90% hồ sơ.
                </p>
              </div>
            </div>

            <Button className="w-full sm:w-fit rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-4 h-auto text-sm transition-colors flex items-center gap-2 group/btn z-10 mt-4 border-none shadow-[0_4px_20px_rgba(16,185,129,0.15)]">
              Trải nghiệm giải pháp doanh nghiệp
              <AltArrowRight className="w-4 h-4 text-emerald-100 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}
