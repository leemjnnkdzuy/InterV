"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, ChatRoundLine, Letter, QuestionCircle, Suitcase } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

export default function ContactSupportPage() {
  const router = useRouter();
  const openEmail = () => {
    window.location.href = "mailto:support@interv.vn";
  };

  return (
    <MarketingShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[620px]">
        <section className="lg:col-span-6 flex flex-col gap-7">
          <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Liên hệ hỗ trợ</span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.07]">Có vấn đề cần xử lý? Gửi tín hiệu cho đội InterV</h1>
          <p className="text-zinc-400 leading-relaxed">Hỗ trợ tài khoản, credits, thanh toán, tư vấn doanh nghiệp hoặc góp ý sản phẩm. Mô tả càng rõ, đội ngũ phản hồi càng nhanh.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={openEmail} className="rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none px-7 py-5 h-auto">
              support@interv.vn
              <Letter className="w-4 h-4" />
            </Button>
            <Button onClick={() => router.push("/team")} variant="outline" className="rounded-full border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-bold px-7 py-5 h-auto">
              Xem đội ngũ
              <AltArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
        <section className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2 rounded-3xl border border-white/[0.08] bg-zinc-950/45 p-7">
            <ChatRoundLine weight="BoldDuotone" className="w-12 h-12 text-[var(--chart-1)]" />
            <h2 className="mt-8 text-2xl font-extrabold text-white">Thông tin nên gửi kèm</h2>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">Email tài khoản, ảnh lỗi nếu có, thời điểm gặp lỗi và thao tác bạn đã thực hiện.</p>
          </div>
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6"><QuestionCircle className="w-9 h-9 text-violet-300" /><h3 className="mt-7 text-lg font-extrabold text-white">Hỗ trợ sản phẩm</h3><p className="mt-2 text-sm text-zinc-400">Đăng nhập, luyện tập, báo cáo và credits.</p></div>
          <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6"><Suitcase className="w-9 h-9 text-emerald-400" /><h3 className="mt-7 text-lg font-extrabold text-white">Tư vấn B2B</h3><p className="mt-2 text-sm text-zinc-400">Quy mô tuyển dụng, demo và báo giá.</p></div>
        </section>
      </div>
    </MarketingShell>
  );
}
