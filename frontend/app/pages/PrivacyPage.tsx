"use client";

import React from "react";
import { Database, LockKeyhole, ShieldCheck, UserCheck } from "@solar-icons/react";
import MarketingShell from "@/app/components/common/MarketingShell";

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="flex flex-col gap-16">
        <section className="max-w-4xl">
          <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Chính sách bảo mật</span>
          <h1 className="mt-5 text-[36px] sm:text-[48px] lg:text-[58px] font-extrabold leading-[1.07]">Dữ liệu phỏng vấn cần được bảo vệ như dữ liệu nghề nghiệp quan trọng</h1>
          <p className="mt-6 text-zinc-400 text-base leading-relaxed">InterV tập trung bảo vệ thông tin tài khoản, nội dung luyện tập, dữ liệu JD và báo cáo đánh giá trong quá trình sử dụng nền tảng.</p>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: LockKeyhole, title: "Tài khoản", text: "Quản lý phiên đăng nhập và thông tin xác thực." },
            { icon: Database, title: "Dữ liệu luyện tập", text: "Lưu nội dung cần thiết để tạo báo cáo và lịch sử." },
            { icon: ShieldCheck, title: "Kiểm soát truy cập", text: "Giới hạn dữ liệu theo tài khoản và quyền sử dụng." },
            { icon: UserCheck, title: "Quyền người dùng", text: "Người dùng quản lý hồ sơ cá nhân trong cài đặt." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6 min-h-64">
                <Icon weight="BoldDuotone" className="w-10 h-10 text-emerald-400" />
                <h2 className="mt-8 text-xl font-extrabold text-white">{item.title}</h2>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{item.text}</p>
              </article>
            );
          })}
        </section>
        <section className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-8">
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">Khi sản phẩm mở rộng thêm tính năng doanh nghiệp, chính sách bảo mật chi tiết sẽ tiếp tục được cập nhật để phản ánh đúng cách dữ liệu được xử lý.</p>
        </section>
      </div>
    </MarketingShell>
  );
}
