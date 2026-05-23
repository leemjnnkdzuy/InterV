"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BarChart3, Users, ChevronRight, Check } from "lucide-react";

interface Candidate {
  name: string;
  role: string;
  match: number;
  culture: string;
  status: "Passed" | "Review" | "Failed";
}

const mockCandidates: Candidate[] = [
  { name: "Nguyễn Văn An", role: "Product Designer", match: 92, culture: "9.0/10", status: "Passed" },
  { name: "Trần Thị Minh", role: "UX Researcher", match: 87, culture: "8.5/10", status: "Review" },
  { name: "Phạm Minh Đức", role: "UI Designer", match: 62, culture: "6.0/10", status: "Failed" },
];

export default function AiScreening() {
  return (
    <section id="ai-screening" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col gap-16">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto gap-4">
          <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Giải pháp doanh nghiệp</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Tự động hóa 90% quy trình sàng lọc sơ loại
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Giúp bộ phận HR tiết kiệm hàng chục giờ phỏng vấn thủ công. Lọc nhanh các ứng viên không đạt yêu cầu chuyên môn nhờ trợ lý AI chấm điểm tự động.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: HR Dashboard Mockup (7 cols) */}
          <div className="lg:col-span-7 flex justify-center w-full order-2 lg:order-1">
            <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-zinc-900/50 backdrop-blur-md p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-5">
              
              {/* Dashboard Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Hiring Pipeline</span>
                  <h5 className="text-sm font-bold text-white">Sàng lọc Product Team - Vòng 1</h5>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI Active
                </div>
              </div>

              {/* Candidate Table Layout */}
              <div className="flex flex-col gap-3">
                {mockCandidates.map((candidate, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-zinc-950/20 hover:border-white/10 hover:bg-white/[0.02] transition-all gap-3"
                  >
                    {/* Basic Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 font-bold text-xs flex items-center justify-center text-zinc-300">
                        {candidate.name.split(" ").slice(-1)[0][0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{candidate.name}</span>
                        <span className="text-[10px] text-zinc-400">{candidate.role}</span>
                      </div>
                    </div>

                    {/* Scoring & Progress */}
                    <div className="flex items-center gap-6 justify-between sm:justify-start">
                      <div className="flex flex-col items-end sm:items-start gap-1">
                        <span className="text-[10px] text-zinc-400 font-medium">Độ khớp JD</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                candidate.status === "Passed" ? "bg-emerald-400" : candidate.status === "Review" ? "bg-[var(--chart-1)]" : "bg-zinc-700"
                              }`} 
                              style={{ width: `${candidate.match}%` }}
                            />
                          </div>
                          <span className="text-xs font-extrabold text-zinc-200">{candidate.match}%</span>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-start gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">Culture Fit</span>
                        <span className="text-xs font-bold text-zinc-200">{candidate.culture}</span>
                      </div>

                      {/* Status Badge */}
                      <span 
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border w-fit uppercase tracking-wider ${
                          candidate.status === "Passed" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : candidate.status === "Review" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-zinc-800/40 text-zinc-400 border-white/5"
                        }`}
                      >
                        {candidate.status === "Passed" ? "Qualified" : candidate.status === "Review" ? "Review" : "Rejected"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Right Column: Features Description (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8 order-1 lg:order-2">
            
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-emerald-400 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h4 className="font-bold text-white text-base md:text-lg">Sàng lọc tự động 24/7</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  AI thay mặt HR thực hiện phỏng vấn sơ loại thông tin trực tiếp với hàng trăm ứng viên đồng thời qua video/audio trực tuyến, không giới hạn khung giờ.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-emerald-400 shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h4 className="font-bold text-white text-base md:text-lg">Báo cáo đánh giá chi tiết</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  AI trích xuất ngay báo cáo đánh giá năng lực chuyên môn, phong cách hành vi và độ tương thích văn hóa (Culture Fit) của từng ứng viên dựa trên JD.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-emerald-400 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h4 className="font-bold text-white text-base md:text-lg">Chống gian lận thông minh</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Thuật toán AI phát hiện chuyển động mắt bất thường, nhận dạng khuôn mặt ứng viên và cảnh báo nếu có hành vi tìm kiếm tài liệu từ màn hình khác.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
