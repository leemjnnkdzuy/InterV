"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, CheckCircle, DocumentText, Magnifer, Star } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const checks = ["Từ khóa chuyên môn", "Thành tích có số liệu", "Độ khớp JD", "Cấu trúc trình bày"];

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[640px]">
        <section className="lg:col-span-5 flex flex-col gap-7">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Đánh giá CV miễn phí</span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.07]">Tối ưu CV trước khi AI phỏng vấn bạn</h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Một CV tốt giúp buổi luyện tập tập trung vào năng lực thật. InterV định hướng cách rà soát hồ sơ theo JD, kỹ năng và bằng chứng tác động.
          </p>
          <Button onClick={() => router.push("/practice")} className="w-fit rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none px-7 py-5 h-auto">
            Dùng JD để luyện ngay
            <AltArrowRight className="w-4 h-4" />
          </Button>
        </section>
        <section className="lg:col-span-7 rounded-3xl border border-white/[0.08] bg-zinc-950/45 backdrop-blur-md p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-[rgba(187,244,81,0.16)] bg-[var(--chart-1)]/[0.04] p-6 md:row-span-2">
              <DocumentText weight="BoldDuotone" className="w-12 h-12 text-[var(--chart-1)]" />
              <h2 className="mt-8 text-2xl font-black text-white">CV readiness score</h2>
              <div className="mt-8 text-6xl font-black text-white">82</div>
              <p className="mt-3 text-sm text-zinc-400">Mẫu điểm mô phỏng cho mức độ sẵn sàng ứng tuyển.</p>
            </div>
            {checks.map((check, index) => (
              <div key={check} className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-5">
                {index % 2 === 0 ? <CheckCircle className="w-7 h-7 text-emerald-400" /> : <Magnifer className="w-7 h-7 text-violet-300" />}
                <h3 className="mt-5 text-base font-extrabold text-white">{check}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">Rà soát nhanh để biết phần nào nên viết rõ hơn trước vòng phỏng vấn.</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-5 flex items-start gap-4">
            <Star weight="BoldDuotone" className="w-8 h-8 text-[var(--chart-1)] flex-shrink-0" />
            <p className="text-sm text-zinc-300 leading-relaxed">Tính năng review CV đầy đủ đang được hoàn thiện. Hiện tại bạn có thể dán JD vào buổi luyện tập để AI tạo câu hỏi sát hồ sơ hơn.</p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
