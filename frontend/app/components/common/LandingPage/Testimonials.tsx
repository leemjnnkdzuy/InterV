"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/app/hooks/useLanguage";

const QuoteIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
)


interface Testimonial {
  quoteKey: string;
  author: string;
  roleKey: string;
  avatar: string;
  type: "candidate" | "employer";
  company?: string;
}

const testimonials: Testimonial[] = [
  {
    quoteKey: "landing.testimonials.quote1",
    author: "Lê Minh Tuấn",
    roleKey: "landing.testimonials.role1",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80",
    type: "candidate"
  },
  {
    quoteKey: "landing.testimonials.quote2",
    author: "Nguyễn Thu Hương",
    roleKey: "landing.testimonials.role2",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
    type: "employer",
    company: "Vingroup"
  },
  {
    quoteKey: "landing.testimonials.quote3",
    author: "Trần Mai Anh",
    roleKey: "landing.testimonials.role3",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80",
    type: "candidate"
  },
  {
    quoteKey: "landing.testimonials.quote4",
    author: "Hoàng Đức Anh",
    roleKey: "landing.testimonials.role4",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
    type: "employer",
    company: "FPT Software"
  }
];

export default function Testimonials() {
  const { t } = useLanguage();

  return (
    <section id="testimonials" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-primary dark:text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">{t("landing.testimonials.eyebrow")}</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {t("landing.testimonials.title")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            {t("landing.testimonials.description")}
          </p>
        </div>

        {/* Grid Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {testimonials.map((item, idx) => (
            <motion.div
              key={idx}
              className="relative rounded-3xl bg-card/85 dark:bg-zinc-900/50 border border-border/80 dark:border-white/[0.08] p-8 flex flex-col justify-between gap-6 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-border dark:hover:border-white/15 transition-all duration-300"
              whileHover={{ y: -4 }}
            >
              {/* Quote Mark */}
              <QuoteIcon className="absolute top-6 right-6 w-8 h-8 text-muted-foreground/15 dark:text-zinc-800/40 z-0 pointer-events-none" />

              {/* Quote Text */}
              <p className="text-foreground/90 dark:text-zinc-300 text-sm sm:text-base leading-relaxed z-10 italic font-medium">
                &quot;{t(item.quoteKey)}&quot;
              </p>

              {/* Author Section */}
              <div className="flex items-center gap-3.5 mt-4 z-10 border-t border-border/60 dark:border-white/5 pt-4">
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border/80 dark:border-white/10">
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
                  <span className="text-xs font-bold text-foreground">{item.author}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-semibold">{t(item.roleKey)}</span>
                    {item.type === "employer" && (
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        {t("landing.testimonials.enterprise")}
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
