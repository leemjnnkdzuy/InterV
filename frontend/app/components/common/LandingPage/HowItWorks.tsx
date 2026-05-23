"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileUp, MessageSquareCode, Award } from "lucide-react";

interface Step {
  num: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    num: "01",
    title: "Chọn vị trí & tải JD",
    description: "Chọn ngành nghề mong muốn hoặc tải lên mô tả công việc (JD). Trợ lý AI sẽ lập tức thiết kế bộ câu hỏi chuyên sâu tương ứng.",
    icon: <FileUp className="w-6 h-6 text-[var(--chart-1)]" />,
  },
  {
    num: "02",
    title: "Đối thoại trực tiếp với AI",
    description: "Khởi động Camera và Micro, bắt đầu buổi phỏng vấn trực quan qua video/audio trực tiếp với trợ lý ảo AI ngay trên trình duyệt.",
    icon: <MessageSquareCode className="w-6 h-6 text-[var(--chart-1)]" />,
  },
  {
    num: "03",
    title: "Nhận báo cáo đánh giá",
    description: "Nhận ngay kết quả phân tích kỹ năng nói, độ tự tin và gợi ý hoàn thiện câu trả lời cùng điểm số đánh giá từ AI.",
    icon: <Award className="w-6 h-6 text-[var(--chart-1)]" />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Quy trình đơn giản</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Chỉ với 3 bước đơn giản
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Hệ thống tối giản hóa quy trình giúp bạn dễ dàng bắt đầu phỏng vấn thử hoặc sàng lọc hồ sơ chỉ trong vài phút.
          </p>
        </div>

        {/* Steps Timeline Container */}
        <div className="relative w-full grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-12 mt-4">
          
          {/* Horizontal dotted connector line (hidden on mobile) */}
          <div className="absolute top-1/4 left-[15%] right-[15%] h-0.5 border-t border-dashed border-zinc-800 hidden md:block z-0" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className="relative flex flex-col items-center text-center gap-6 z-10 bg-[var(--sidebar)] px-4"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step Circle with Icon */}
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-white/5 shadow-sm z-10">
                {step.icon}
                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 bg-[var(--chart-1)] text-zinc-950 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md shadow-[var(--chart-1)]/10">
                  {step.num}
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-2.5 max-w-xs">
                <h4 className="font-bold text-white text-base md:text-lg">
                  {step.title}
                </h4>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}
