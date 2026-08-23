"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Lightbulb,
  MedalStar,
  Star,
  ClockCircle,
  AltArrowRight,
  Code,
  Suitcase,
  UserSpeak,
  DocumentText,
  CpuBolt,
  Microphone,
  Chart,
} from "@solar-icons/react";
import { useLanguage } from "@/app/hooks/useLanguage";
import api from "@/app/lib/Client";
import type { HomeDashboardResponse } from "@/app/types";

const EMPTY_DASHBOARD: HomeDashboardResponse = {
  success: true,
  stats: {
    totalInterviews: 0,
    averageScore: 0,
    totalDurationSec: 0,
  },
  recentSessions: [],
};

export default function HomePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [dashboard, setDashboard] =
    useState<HomeDashboardResponse>(EMPTY_DASHBOARD);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const numberLocale =
    language === "zh" ? "zh-CN" : language === "en" ? "en-US" : "vi-VN";

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await api.get<HomeDashboardResponse>(
          "/practice/dashboard"
        );
        if (!cancelled && response.data.success) {
          setDashboard(response.data);
        }
      } catch (error: unknown) {
        console.error("Unable to load practice dashboard:", error);
      } finally {
        if (!cancelled) {
          setIsDashboardLoading(false);
        }
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.greetingMorning");
    if (hour < 18) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  };

  const formatDuration = (totalSeconds: number) => {
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const stats = [
    {
      title: t("home.statsInterviews"),
      value: isDashboardLoading
        ? "--"
        : dashboard.stats.totalInterviews.toLocaleString(numberLocale),
      description: t("home.statsInterviewsDesc"),
      icon: UserSpeak,
      color: "text-blue-500",
      badge: "Phiên phỏng vấn",
    },
    {
      title: t("home.statsAvgScore"),
      value: isDashboardLoading
        ? "--"
        : `${dashboard.stats.averageScore.toFixed(1)}/100`,
      description: t("home.statsAvgScoreDesc"),
      icon: MedalStar,
      color: "text-emerald-500",
      badge: "Đánh giá chung",
    },
    {
      title: t("home.statsDuration"),
      value: isDashboardLoading
        ? "--"
        : formatDuration(dashboard.stats.totalDurationSec),
      description: t("home.statsDurationDesc"),
      icon: ClockCircle,
      color: "text-amber-500",
      badge: "Thời lượng",
    },
  ];

  const practiceTracks = [
    {
      title: t("home.quickTech"),
      desc: t("home.quickTechDesc"),
      icon: Code,
      color: "text-blue-500",
      tag: "Kỹ thuật & Thuật toán",
    },
    {
      title: t("home.quickBehavioral"),
      desc: t("home.quickBehavioralDesc"),
      icon: Lightbulb,
      color: "text-purple-500",
      tag: "Kỹ năng mềm & STAR",
    },
    {
      title: t("home.quickPm"),
      desc: t("home.quickPmDesc"),
      icon: Suitcase,
      color: "text-amber-500",
      tag: "Sản phẩm & Quản trị",
    },
    {
      title: "Luyện theo JD & CV",
      desc: "Tải lên CV cá nhân và mô tả công việc để AI tạo bộ câu hỏi độc quyền dành riêng cho bạn.",
      icon: Star,
      color: "text-emerald-500",
      tag: "Cá nhân hóa 100%",
    },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto pb-10"
    >
      {/* Header & Welcome Row */}
      <motion.div variants={itemVariants} className="space-y-1.5 text-left">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
          {getGreeting()}, {user?.username || "Bạn"}!
        </h1>
        <p className="text-muted-foreground text-sm lg:text-base max-w-2xl">
          {t("home.welcomeBack")}
        </p>
      </motion.div>

      {/* Stats Cards Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="relative overflow-hidden border bg-card/60 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group p-6 py-6 gap-3 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </span>
                <Icon className={`h-8 w-8 ${stat.color}`} weight="BoldDuotone" />
              </div>

              <div>
                <div className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {stat.description}
                </p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      {/* Main Hero Showcase Card */}
      <motion.div variants={itemVariants} className="text-left">
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-card/80 via-card/50 to-primary/10 backdrop-blur-xl p-6 sm:p-8 lg:p-10 shadow-lg shadow-primary/5">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info */}
            <div className="lg:col-span-7 space-y-5">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-tight">
                {t("home.ctaTitle")}
              </h2>

              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
                {t("home.ctaDesc")}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => router.push("/practice")}
                  className="rounded-full px-7 py-6 shadow-xl shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-bold group transition-all duration-300"
                >
                  <span>{t("home.ctaButton")}</span>
                  <AltArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/history")}
                  className="rounded-full px-6 py-6 border-border/80 bg-background/50 hover:bg-muted/80 text-sm font-bold backdrop-blur-sm"
                >
                  <DocumentText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{t("home.recentHistory")}</span>
                </Button>
              </div>
            </div>

            {/* Right Highlights Pill Grid */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-4 transition-all hover:border-primary/30">
                <CpuBolt className="h-8 w-8 shrink-0 text-blue-500" weight="BoldDuotone" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Phản hồi & Chấm điểm tức thì
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Đánh giá chi tiết năng lực chuyên môn và phương pháp STAR.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-4 transition-all hover:border-primary/30">
                <Microphone className="h-8 w-8 shrink-0 text-purple-500" weight="BoldDuotone" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Tương tác giọng nói tự nhiên
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Lắng nghe, ngắt nghỉ và đối thoại đa chiều như phỏng vấn thật.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-4 transition-all hover:border-primary/30">
                <Chart className="h-8 w-8 shrink-0 text-emerald-500" weight="BoldDuotone" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Báo cáo phân tích chuyên sâu
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Chỉ ra điểm mạnh, điểm cần cải thiện và gợi ý câu trả lời mẫu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Practice Tracks Section */}
      <motion.div variants={itemVariants} className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg lg:text-xl font-bold tracking-tight text-foreground">
              {t("home.quickTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lựa chọn chủ đề phỏng vấn phù hợp với mục tiêu phát triển của bạn
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {practiceTracks.map((track, i) => {
            const Icon = track.icon;
            return (
              <Card
                key={i}
                onClick={() => router.push("/practice")}
                className="group relative overflow-hidden border bg-card/60 backdrop-blur-xl hover:border-primary/40 hover:bg-card/90 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 p-5 py-5 gap-3.5 flex flex-col justify-between text-left"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-8 w-8 ${track.color}`} weight="BoldDuotone" />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                      {track.tag}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {track.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-center text-xs font-bold text-primary gap-1 group-hover:gap-2 transition-all">
                  <span>Luyện tập ngay</span>
                  <AltArrowRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
