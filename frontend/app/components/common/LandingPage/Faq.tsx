"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AltArrowDown } from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";


interface FaqItem {
  questionKey: string;
  answerKey: string;
}

const faqData: FaqItem[] = [
  {
    questionKey: "landing.faq.q1",
    answerKey: "landing.faq.a1"
  },
  {
    questionKey: "landing.faq.q2",
    answerKey: "landing.faq.a2"
  },
  {
    questionKey: "landing.faq.q3",
    answerKey: "landing.faq.a3"
  }
];

export default function Faq() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="w-full px-12 md:px-36 py-24 bg-transparent relative z-10">
      <div className="w-full mx-auto flex flex-col items-center gap-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl flex flex-col gap-4">
          <span className="text-primary dark:text-[var(--chart-1)] text-xs font-bold tracking-wider uppercase">{t("landing.faq.eyebrow")}</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {t("landing.faq.title")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            {t("landing.faq.description")}
          </p>
        </div>

        {/* Accordions List */}
        <div className="w-full flex flex-col gap-4">
          {faqData.map((item, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div 
                key={idx}
                className="rounded-2xl border border-border/80 dark:border-white/5 bg-card/85 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
              >
                {/* Header Button */}
                <button
                  onClick={() => toggleIndex(idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-foreground dark:text-zinc-200 hover:text-primary dark:hover:text-white text-sm sm:text-base transition-colors focus:outline-none"
                >
                  <span>{t(item.questionKey)}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-muted-foreground shrink-0 ml-4"
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
                      <div className="px-6 pb-6 text-muted-foreground dark:text-zinc-400 text-xs sm:text-sm leading-relaxed border-t border-border/60 dark:border-white/5 pt-4">
                        {t(item.answerKey)}
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
