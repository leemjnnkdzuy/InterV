"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, Chart, ClipboardList, Suitcase, UsersGroupRounded } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        <aside className="xl:col-span-4 xl:sticky xl:top-32 flex flex-col gap-6">
          <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Giải pháp tuyển dụng</span>
          <h1 className="text-[36px] sm:text-[48px] font-extrabold leading-[1.08]">Giảm tải vòng sơ loại mà vẫn giữ chất lượng đánh giá</h1>
          <p className="text-zinc-400 leading-relaxed">InterV giúp HR tạo một lớp phỏng vấn AI đầu tiên: nhất quán, đo lường được và dễ bàn giao cho hiring manager.</p>
          <Button onClick={() => router.push("/contact-support")} className="w-fit rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none px-7 py-5 h-auto">
            Nhận tư vấn
            <AltArrowRight className="w-4 h-4" />
          </Button>
        </aside>
        <section className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Suitcase, title: "Từ JD đến bộ tiêu chí", desc: "Biến mô tả công việc thành tiêu chí đánh giá và câu hỏi phỏng vấn vòng đầu." },
            { icon: UsersGroupRounded, title: "Ứng viên phỏng vấn độc lập", desc: "Ứng viên tự tham gia phỏng vấn qua web, không cần đồng bộ lịch với HR." },
            { icon: Chart, title: "Báo cáo so sánh", desc: "Nhận điểm, nhận xét, điểm mạnh và điểm cần xem xét của từng ứng viên." },
            { icon: ClipboardList, title: "Shortlist rõ ràng", desc: "Ưu tiên ứng viên phù hợp để đội tuyển dụng dành thời gian cho vòng sâu." },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className={`rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-7 min-h-72 ${index === 0 ? "md:col-span-2" : ""}`}>
                <Icon weight="BoldDuotone" className="w-11 h-11 text-emerald-400" />
                <h2 className="mt-10 text-2xl font-extrabold text-white">{item.title}</h2>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed max-w-xl">{item.desc}</p>
              </article>
            );
          })}
        </section>
      </div>
    </MarketingShell>
  );
}
