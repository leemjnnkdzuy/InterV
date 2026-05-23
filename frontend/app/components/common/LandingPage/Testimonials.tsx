"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Quote, Sparkles } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
  type: "candidate" | "employer";
  company?: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "Nhờ luyện tập phỏng vấn thử với trợ lý AI của InterV 3 lần trước ngày hẹn chính thức, mình đã bình tĩnh và tự tin trả lời lưu loát các tình huống chuyên môn khó để nhận được offer công việc mong ước.",
    author: "Lê Minh Tuấn",
    role: "Senior Frontend Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80",
    type: "candidate"
  },
  {
    quote: "InterV đã giúp phòng Nhân sự của chúng tôi giảm hơn 60% thời gian phỏng vấn vòng sơ loại mà vẫn chọn lọc được các ứng viên chất lượng cao nhờ hệ thống chấm điểm độ khớp JD tự động cực kỳ chính xác.",
    author: "Nguyễn Thu Hương",
    role: "HR Director tại Vingroup",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
    type: "employer",
    company: "Vingroup"
  },
  {
    quote: "Là người hướng nội, tôi rất sợ phỏng vấn. Nhưng khi luyện tập riêng tư với AI, tôi nhận được nhận xét cụ thể về lỗi lặp từ thừa, tốc độ nói nhanh và điều chỉnh được phong thái nói tự tin hơn rõ rệt.",
    author: "Trần Mai Anh",
    role: "Digital Marketer",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80",
    type: "candidate"
  },
  {
    quote: "Trước đây HR mất 2 tuần để gọi sơ vấn 100 hồ sơ. Bây giờ với trợ lý phỏng vấn video AI 24/7, chúng tôi chỉ mất đúng 1 buổi chiều để nhận được danh sách xếp hạng ứng viên chi tiết kèm file ghi âm.",
    author: "Hoàng Đức Anh",
    role: "Talent Acquisition Manager",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
    type: "employer",
    company: "FPT Software"
  }
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Đánh giá thực tế</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Khách hàng nói gì về InterV?
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Hàng ngàn ứng viên đã chinh phục được buổi phỏng vấn mơ ước và nhiều doanh nghiệp đã tự động hóa quy trình tuyển dụng thành công.
          </p>
        </div>

        {/* Grid Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {testimonials.map((item, idx) => (
            <motion.div
              key={idx}
              className="relative rounded-3xl bg-zinc-900/50 border border-white/[0.08] p-8 flex flex-col justify-between gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-white/15 transition-all duration-300"
              whileHover={{ y: -4 }}
            >
              {/* Quote Mark */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-800/40 z-0 pointer-events-none" />

              {/* Quote Text */}
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed z-10 italic font-medium">
                "{item.quote}"
              </p>

              {/* Author Section */}
              <div className="flex items-center gap-3.5 mt-4 z-10 border-t border-white/5 pt-4">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                  <Image
                    src={item.avatar}
                    alt={item.author}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{item.author}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 font-semibold">{item.role}</span>
                    {item.type === "employer" && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        Enterprise
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
