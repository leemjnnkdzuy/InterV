"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, CheckCircle, ShieldCheck, Suitcase } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const plans = [
  { name: "Starter", desc: "Thử nghiệm AI screening cho đội nhỏ.", items: ["Theo lượt phỏng vấn", "Báo cáo cơ bản", "Thiết lập nhanh"] },
  { name: "Business", desc: "Vận hành tuyển dụng định kỳ.", items: ["Rubric tùy chỉnh", "Bảng xếp hạng", "Hỗ trợ HR team"] },
  { name: "Enterprise", desc: "Quy trình riêng và bảo mật cao.", items: ["Tích hợp hệ thống", "SLA hỗ trợ", "Phân quyền nâng cao"] },
];

export default function Page() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="flex flex-col gap-16">
        <section className="max-w-3xl">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Bảng giá B2B</span>
          <h1 className="mt-5 text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.07]">Gói doanh nghiệp theo quy mô tuyển dụng</h1>
          <p className="mt-6 text-zinc-400 text-base leading-relaxed">InterV linh hoạt từ nhóm HR nhỏ cần thử nghiệm đến doanh nghiệp cần workflow phỏng vấn AI riêng.</p>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`rounded-3xl border p-7 flex flex-col justify-between min-h-[420px] ${index === 1 ? "border-[rgba(187,244,81,0.22)] bg-[var(--chart-1)]/[0.04]" : "border-white/[0.08] bg-zinc-900/50"}`}>
              <div>
                <Suitcase weight="BoldDuotone" className={`w-10 h-10 ${index === 1 ? "text-[var(--chart-1)]" : "text-emerald-400"}`} />
                <h2 className="mt-8 text-3xl font-black text-white">{plan.name}</h2>
                <p className="mt-3 text-sm text-zinc-400">{plan.desc}</p>
                <div className="mt-8 flex flex-col gap-3">
                  {plan.items.map((item) => <div key={item} className="flex items-center gap-3 text-sm text-zinc-300"><CheckCircle className="w-5 h-5 text-[var(--chart-1)]" />{item}</div>)}
                </div>
              </div>
              <Button onClick={() => router.push("/contact-support")} variant={index === 1 ? "default" : "outline"} className={index === 1 ? "mt-10 rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none" : "mt-10 rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"}>
                Liên hệ báo giá
                <AltArrowRight className="w-4 h-4" />
              </Button>
            </article>
          ))}
        </section>
        <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/35 p-7 flex flex-col md:flex-row gap-5 items-start md:items-center">
          <ShieldCheck weight="BoldDuotone" className="w-10 h-10 text-emerald-400" />
          <p className="text-sm text-zinc-300 leading-relaxed">Các gói có thể điều chỉnh theo số lượt phỏng vấn, vị trí tuyển dụng, yêu cầu bảo mật và mức hỗ trợ triển khai.</p>
        </section>
      </div>
    </MarketingShell>
  );
}
