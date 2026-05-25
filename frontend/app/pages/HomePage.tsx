"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Brain,
  MessageSquareCode,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  Video,
  Code,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function HomePage() {
  const { user } = useAuthContext();
  const { t } = useLanguage();

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.greetingMorning");
    if (hour < 18) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  };

  // Mock stats
  const stats = [
    {
      title: t("home.statsInterviews"),
      value: "8",
      description: t("home.statsInterviewsDesc"),
      icon: MessageSquareCode,
      color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      title: t("home.statsAvgScore"),
      value: "8.2",
      description: t("home.statsAvgScoreDesc"),
      icon: Award,
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      title: t("home.statsDuration"),
      value: "2h 45m",
      description: t("home.statsDurationDesc"),
      icon: Clock,
      color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  // Mock recent sessions
  const recentSessions = [
    {
      id: "1",
      position: "Frontend Developer",
      date: "24/05/2026",
      duration: "18 phút",
      score: 8.5,
      status: "completed",
    },
    {
      id: "2",
      position: "Node.js Backend Developer",
      date: "20/05/2026",
      duration: "25 phút",
      score: 7.8,
      status: "completed",
    },
    {
      id: "3",
      position: "Product Manager (Mock)",
      date: "15/05/2026",
      duration: "12 phút",
      score: 6.5,
      status: "completed",
    },
  ];

  // Quick selections for practice
  const quickTracks = [
    {
      title: t("home.quickTech"),
      desc: t("home.quickTechDesc"),
      icon: Code,
      color: "text-blue-500",
    },
    {
      title: t("home.quickBehavioral"),
      desc: t("home.quickBehavioralDesc"),
      icon: Brain,
      color: "text-purple-500",
    },
    {
      title: t("home.quickPm"),
      desc: t("home.quickPmDesc"),
      icon: Briefcase,
      color: "text-amber-500",
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Header Greeting */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-left">
          {getGreeting()}, {user?.username || "Bạn"}! 👋
        </h1>
        <p className="text-muted-foreground text-sm lg:text-base max-w-2xl text-left">
          {t("home.welcomeBack")}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-xl border bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="text-left">
              <div className="text-3xl font-extrabold tracking-tight mt-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Row: CTA & Quick Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main CTA to practice */}
        <motion.div variants={itemVariants} className="lg:col-span-2 text-left">
          <Card className="h-full border border-primary/20 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 relative overflow-hidden flex flex-col justify-between p-6 lg:p-8">
            <div className="absolute top-0 right-0 p-8 text-primary/10 pointer-events-none">
              <Video className="h-32 w-32" />
            </div>

            <div className="space-y-4 max-w-lg z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.ctaBadge")}
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                {t("home.ctaTitle")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("home.ctaDesc")}
              </p>
            </div>

            <div className="mt-8 z-10">
              <Button asChild size="default" className="rounded-xl px-6 py-5 shadow-lg shadow-primary/20 bg-primary text-background hover:bg-primary/95 text-base font-semibold group transition-all duration-300">
                <Link href="/practice">
                  {t("home.ctaButton")}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Quick Selection */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6 text-left">
          <h3 className="text-lg font-bold tracking-tight text-foreground">{t("home.quickTitle")}</h3>
          <div className="flex flex-col gap-4 flex-1 justify-between">
            {quickTracks.map((track, i) => (
              <Card key={i} className="hover:border-foreground/20 hover:bg-card/90 transition-all duration-200 cursor-pointer border bg-card/60 backdrop-blur-md">
                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                  <div className={`p-2 rounded-xl bg-muted border ${track.color}`}>
                    <track.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold">{track.title}</CardTitle>
                    <CardDescription className="text-xs leading-normal">
                      {track.desc}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>

      {/* History table */}
      <motion.div variants={itemVariants} className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-foreground">{t("home.recentHistory")}</h3>
          <Link href="/history" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            {t("home.viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card className="border bg-card/60 backdrop-blur-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase border-b bg-muted/40">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">{t("home.colPosition")}</th>
                  <th scope="col" className="px-6 py-4 font-semibold">{t("home.colDate")}</th>
                  <th scope="col" className="px-6 py-4 font-semibold">{t("home.colDuration")}</th>
                  <th scope="col" className="px-6 py-4 font-semibold">{t("home.colScore")}</th>
                  <th scope="col" className="px-6 py-4 font-semibold">{t("home.colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{session.position}</td>
                    <td className="px-6 py-4 text-muted-foreground">{session.date}</td>
                    <td className="px-6 py-4 text-muted-foreground">{session.duration}</td>
                    <td className="px-6 py-4 font-semibold">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                        session.score >= 8.0 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}>
                        {session.score}/10
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-500/20">
                        {session.status === "completed" ? t("home.statusCompleted") : t("home.statusInProgress")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
