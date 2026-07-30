"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AltArrowRight, PenNewRound, Star, Suitcase } from "@solar-icons/react";
import { Button } from "@/app/components/ui/button";
import MarketingShell from "@/app/components/common/MarketingShell";

const posts = [
  { title: "Trả lời behavioral bằng STAR nhưng không máy móc", tag: "Ứng viên", icon: Star },
  { title: "Thiết kế rubric phỏng vấn cho vị trí product", tag: "HR", icon: Suitcase },
  { title: "Dùng AI để luyện nói trước buổi phỏng vấn", tag: "AI", icon: PenNewRound },
];

export default function BlogPage() {
  const router = useRouter();

  return (
    <MarketingShell>
      <div className="flex flex-col gap-16">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <span className="text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">Blog & chia sẻ</span>
            <h1 className="mt-5 text-[36px] sm:text-[48px] lg:text-[60px] font-extrabold leading-[1.07]">Góc nhìn thực tế về phỏng vấn, nghề nghiệp và AI tuyển dụng</h1>
          </div>
          <div className="lg:col-span-4">
            <p className="text-zinc-400 leading-relaxed">Các bài viết giúp ứng viên luyện tập tốt hơn và giúp doanh nghiệp xây quy trình đánh giá rõ ràng hơn.</p>
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {posts.map((post, index) => {
            const Icon = post.icon;
            return (
              <article key={post.title} className={`rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-7 min-h-80 flex flex-col justify-between ${index === 0 ? "lg:col-span-2" : ""}`}>
                <div className="flex items-center justify-between">
                  <Icon weight="BoldDuotone" className="w-10 h-10 text-[var(--chart-1)]" />
                  <span className="text-xs rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-zinc-300">{post.tag}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white max-w-xl">{post.title}</h2>
                  <p className="mt-3 text-sm text-zinc-400">Nội dung blog chính thức đang được cập nhật trong hệ thống InterV.</p>
                </div>
              </article>
            );
          })}
        </section>
        <Button onClick={() => router.push("/practice")} className="w-fit rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold border-none px-7 py-5 h-auto">
          Luyện tập ngay
          <AltArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </MarketingShell>
  );
}
