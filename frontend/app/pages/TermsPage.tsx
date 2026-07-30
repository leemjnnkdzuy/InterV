"use client";

import React from "react";
import { CheckCircle, DocumentText, ShieldCheck } from "@solar-icons/react";
import MarketingShell from "@/app/components/common/MarketingShell";

const terms = [
  { title: "Sử dụng hợp lệ", text: "Người dùng chịu trách nhiệm về thông tin tài khoản, nội dung tải lên và cách sử dụng kết quả AI." },
  { title: "Kết quả AI", text: "Báo cáo của InterV là thông tin hỗ trợ luyện tập hoặc sàng lọc, không phải cam kết tuyển dụng." },
  { title: "An toàn nền tảng", text: "Không khai thác, gây gián đoạn, sao chép trái phép hoặc dùng hệ thống cho mục đích gian lận." },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <section className="lg:col-span-4">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Điều khoản dịch vụ</span>
          <h1 className="mt-5 text-[36px] sm:text-[48px] font-extrabold leading-[1.08]">Nguyên tắc sử dụng InterV</h1>
          <p className="mt-5 text-zinc-400 leading-relaxed">Bản tóm tắt các nguyên tắc chính khi sử dụng nền tảng luyện phỏng vấn và đánh giá ứng viên bằng AI.</p>
        </section>
        <section className="lg:col-span-8 rounded-3xl border border-white/[0.08] bg-zinc-950/45 p-6 md:p-8">
          <DocumentText weight="BoldDuotone" className="w-12 h-12 text-[var(--chart-1)]" />
          <div className="mt-8 flex flex-col gap-4">
            {terms.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-zinc-900/45 p-5 flex gap-4">
                {index === 2 ? <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" /> : <CheckCircle className="w-6 h-6 text-[var(--chart-1)] flex-shrink-0" />}
                <div>
                  <h2 className="text-lg font-extrabold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
