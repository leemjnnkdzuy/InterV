"use client";

import React from "react";
import { motion } from "framer-motion";
import { CpuBolt, Pulse, LockKeyhole } from "@solar-icons/react";

interface Benefit {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgGlow: string;
  iconColor: string;
  iconBg: string;
}

const benefits: Benefit[] = [
  {
    title: "Đối thoại thông minh tự nhiên",
    description: "Công nghệ AI đàm thoại thế hệ mới giúp trợ lý ảo hỏi đáp và phản hồi ngữ cảnh thực tế, không rập khuôn theo kịch bản có sẵn.",
    icon: <CpuBolt weight="BoldDuotone" className="w-11 h-11" />,
    bgGlow: "bg-[var(--chart-1)]/5",
    iconColor: "text-[var(--chart-1)]",
    iconBg: "",
  },
  {
    title: "Phân tích tâm lý & kỹ năng sâu",
    description: "Đánh giá chính xác từ vựng chuyên ngành, đo lường tốc độ nói, phát hiện từ đệm thừa và phân tích biểu cảm tự tin khuôn mặt.",
    icon: <Pulse weight="BoldDuotone" className="w-11 h-11" />,
    bgGlow: "bg-emerald-500/5",
    iconColor: "text-emerald-400",
    iconBg: "",
  },
  {
    title: "Bảo mật thông tin tuyệt đối",
    description: "Cam kết bảo mật 100% dữ liệu cuộc gọi video của ứng viên và thông tin tuyển dụng doanh nghiệp theo tiêu chuẩn bảo mật dữ liệu toàn cầu.",
    icon: <LockKeyhole weight="BoldDuotone" className="w-11 h-11" />,
    bgGlow: "bg-violet-500/5",
    iconColor: "text-violet-400",
    iconBg: "",
  },
];

export default function WhyOurAi() {
  return (
    <section id="why-our-ai" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Sức mạnh công nghệ</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Ưu điểm vượt trội từ Trợ lý AI
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Ứng dụng các thuật toán học sâu và xử lý ngôn ngữ tự nhiên tiên tiến để mang lại kết quả đánh giá chân thực, chuẩn xác nhất.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="relative group rounded-3xl border border-white/[0.08] bg-zinc-900/50 backdrop-blur-md p-8 flex flex-col gap-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300"
            >
              {/* Radial gradient background hover glow */}
              <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full ${benefit.bgGlow} blur-3xl`} />

              {/* Icon Container */}
              <div className={`w-12 h-12 ${benefit.iconColor} flex items-center justify-center z-10`}>
                {benefit.icon}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-3 z-10">
                <h4 className="font-bold text-white text-base md:text-lg">
                  {benefit.title}
                </h4>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
