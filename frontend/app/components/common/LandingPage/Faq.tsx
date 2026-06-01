"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AltArrowDown } from "@solar-icons/react";


interface FaqItem {
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    question: "Nền tảng có hỗ trợ phỏng vấn bằng tiếng Anh không?",
    answer: "Có. Trợ lý ảo AI của InterV hỗ trợ phỏng vấn đa ngôn ngữ hoàn toàn, bao gồm cả tiếng Anh lẫn tiếng Việt. AI có khả năng nhận diện phát âm, kiểm tra ngữ pháp và chấm điểm từ vựng chuyên ngành một cách chính xác."
  },
  {
    question: "Ứng viên có cần cài đặt phần mềm hay extension nào không?",
    answer: "Không cần cài đặt bất kỳ phần mềm nào. Nền tảng của chúng tôi chạy trực tiếp trên môi trường web. Ứng viên chỉ cần mở trình duyệt (Chrome, Safari, Edge...) trên máy tính hoặc điện thoại, cấp quyền Micro là có thể thực hiện phỏng vấn ngay lập tức."
  },
  {
    question: "Doanh nghiệp có được trải nghiệm dùng thử miễn phí không?",
    answer: "Có. Chúng tôi cung cấp chương trình dùng thử miễn phí cho doanh nghiệp để trải nghiệm đầy đủ các tính năng: từ tạo JD tùy chỉnh, tự động hóa phỏng vấn thử với 10 lượt ứng viên, đến xem báo cáo xếp hạng và công nghệ chống gian lận."
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Giải đáp thắc mắc</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Câu hỏi thường gặp
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Mọi thắc mắc của bạn về tính năng ngôn ngữ, cài đặt hoặc chính sách doanh nghiệp đều được giải đáp ở đây.
          </p>
        </div>

        {/* Accordions List */}
        <div className="w-full flex flex-col gap-4">
          {faqData.map((item, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div 
                key={idx}
                className="rounded-2xl border border-white/5 bg-zinc-900/50 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
              >
                {/* Header Button */}
                <button
                  onClick={() => toggleIndex(idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-zinc-200 hover:text-white text-sm sm:text-base transition-colors focus:outline-none"
                >
                  <span>{item.question}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-zinc-500 shrink-0 ml-4"
                  >
                    <AltArrowDown className="w-5 h-5" />
                  </motion.div>
                </button>

                {/* Animated Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-4">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
