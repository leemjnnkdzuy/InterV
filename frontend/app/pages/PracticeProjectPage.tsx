"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrashBinMinimalistic,
  PenNewSquare,
  Play,
  Widget,
  List,
  FolderOpen
} from "@solar-icons/react";
import { Plus, Check, X } from "lucide-react";
import { Card, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { CreatePracticeDialog, ConfirmDeleteDialog } from "@/app/components/common/Dialog";
import ResultPracticeDrawer from "@/app/components/common/Drawer/ResultPracticeDrawer";
import { practiceService } from "@/app/services";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateIndustry } from "@/app/lib/Localization";
import type {
  PracticeMutationResponse,
  PracticeProjectSession,
  PracticeSessionsResponse,
} from "@/app/types";

export default function PracticeProjectPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<PracticeProjectSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);

  const [selectedSessionForResult, setSelectedSessionForResult] = useState<PracticeProjectSession | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [sessionToDelete, setSessionToDelete] = useState<PracticeProjectSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = (await practiceService.getAll()) as PracticeSessionsResponse;
      if (data.success) {
        setSessions(data.sessions);
      } else {
        toast.error(t("practiceList.loadFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("practiceSetup.serverConnectionError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSessions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSessions]);

  const handleCreateSuccess = (newSession: PracticeProjectSession) => {
    setSessions((prev) => [newSession, ...prev]);
  };

  const handleStartRename = (session: PracticeProjectSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim()) {
      toast.error(t("practiceList.titleRequired"));
      return;
    }

    try {
      setIsSavingRename(true);
      const data = (await practiceService.update(id, { title: editingTitle.trim() })) as PracticeMutationResponse;
      if (data.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, title: data.session.title } : s))
        );
        toast.success(t("practiceList.renameSuccess"));
        setEditingSessionId(null);
      } else {
        toast.error(data.message || t("practiceList.renameFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("practiceList.renameError"));
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleDeleteClick = (session: PracticeProjectSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(session);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;

    try {
      setIsDeleting(true);
      const data = await practiceService.delete(sessionToDelete.id);
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
        toast.success(t("practiceList.deleteSuccess"));
        setSessionToDelete(null);
      } else {
        toast.error(data.message || t("practiceList.deleteFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("practiceList.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenResult = (session: PracticeProjectSession, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.latestResult) {
      toast.info(t("practiceList.noResultInfo"));
      return;
    }
    setSelectedSessionForResult(session);
    setIsDrawerOpen(true);
  };

  const getIndustryBadgeColor = (industry: string = "") => {
    switch (industry) {
      case "Công nghệ thông tin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Marketing & Quảng cáo":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Tài chính & Ngân hàng":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Kinh doanh & Bán hàng":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Quản trị nhân sự":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "Chăm sóc khách hàng":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "Thiết kế & Nghệ thuật":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Kế toán & Kiểm toán":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Quản lý sản phẩm":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "Giáo dục & Đào tạo":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Y tế & Dược phẩm":
        return "bg-teal-500/10 text-teal-500 border-teal-500/20";
      case "Luật & Pháp lý":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      case "Xây dựng & Bất động sản":
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      case "Du lịch & Nhà hàng - Khách sạn":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/40";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="dark relative -m-6 min-h-screen overflow-hidden bg-transparent px-6 py-6 lg:-m-8 lg:px-8 lg:py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 space-y-8 max-w-7xl mx-auto pb-10"
      >
      {/* Top Controls Bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 border-b border-border/10 pb-6 text-left">
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-2xl py-5 px-5 font-extrabold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/95 text-sm gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {t("practiceList.createButton")}
        </Button>

        <div className="flex items-center bg-muted/30 border border-border/10 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              viewMode === "grid"
                ? "bg-background shadow text-primary border border-border/10"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
            title={t("practiceList.gridView")}
          >
            <Widget className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              viewMode === "list"
                ? "bg-background shadow text-primary border border-border/10"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
            title={t("practiceList.listView")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Main List Sections */}
      {isLoading ? (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4" 
          : "flex flex-col gap-4 pt-4"
        }>
          {[1, 2, 3].map((n) => (
            <Card key={n} className={`border bg-card/40 animate-pulse flex justify-between p-6 ${viewMode === "grid" ? "h-64 flex-col" : "flex-row items-center h-24"}`}>
              {viewMode === "grid" ? (
                <>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted/60 rounded-full w-24" />
                    <div className="h-6 bg-muted/60 rounded-full w-3/4" />
                    <div className="h-3 bg-muted/60 rounded-full w-5/6" />
                    <div className="h-3 bg-muted/60 rounded-full w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 bg-muted/60 rounded-2xl flex-1" />
                    <div className="h-10 bg-muted/60 rounded-2xl flex-1" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted/60 rounded-full w-24" />
                    <div className="h-5 bg-muted/60 rounded-full w-1/3" />
                  </div>
                  <div className="w-1/4 h-8 bg-muted/60 rounded-full mx-4" />
                  <div className="flex gap-2 w-[280px]">
                    <div className="h-10 bg-muted/60 rounded-xl flex-1" />
                    <div className="h-10 bg-muted/60 rounded-xl flex-1" />
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <motion.div 
          variants={itemVariants} 
          className="flex flex-col items-center justify-center min-h-[65vh] px-6 text-center"
        >
          <div className="text-primary mb-5">
            <FolderOpen weight="BoldDuotone" className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">{t("practiceList.emptyTitle")}</h3>
          <p className="text-muted-foreground text-xs max-w-sm leading-relaxed mb-6">
            {t("practiceList.emptyDescription")}
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-2xl py-5 px-6 font-bold shadow-md shadow-primary/15 bg-primary text-background hover:bg-primary/95 text-xs gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("practiceList.emptyCreateButton")}
          </Button>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants} 
          className={viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2"
            : "flex flex-col gap-4 pt-2"
          }
        >
          <AnimatePresence mode="popLayout">
            {sessions.map((session) => {
              const hasPracticed = session.attemptCount > 0;
              const isRenaming = editingSessionId === session.id;

              return (
                <motion.div
                  key={session.id}
                  layoutId={session.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="group relative w-full"
                >
                  {viewMode === "grid" ? (
                    <Card className="h-full border border-border/10 hover:border-primary/30 bg-card/40 hover:bg-card/60 backdrop-blur-md shadow-sm hover:shadow-md hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between overflow-hidden rounded-[28px] p-6 text-left">
                      {/* Top content block */}
                      <div className="w-full flex-1 flex flex-col">
                        {/* Header: Industry tag & delete icon */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${getIndustryBadgeColor(session.industry)}`}>
                            {session.industry ? translateIndustry(t, session.industry) : t("practiceList.industryFallback")}
                          </span>
                          <button
                            onClick={(e) => handleDeleteClick(session, e)}
                            className="p-1.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                            title={t("practiceList.deleteTitle")}
                          >
                            <TrashBinMinimalistic className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Title Area */}
                        <div className="mb-4">
                          {isRenaming ? (
                            <div className="flex items-center gap-1.5 w-full h-9 my-1">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRename(session.id);
                                  if (e.key === "Escape") setEditingSessionId(null);
                                }}
                                className="bg-card border border-primary/50 text-foreground text-sm font-bold rounded-xl px-2.5 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-primary w-full"
                                autoFocus
                                disabled={isSavingRename}
                              />
                              <button
                                onClick={() => handleSaveRename(session.id)}
                                disabled={isSavingRename}
                                className="p-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/10 cursor-pointer disabled:opacity-50 shrink-0"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingSessionId(null)}
                                disabled={isSavingRename}
                                className="p-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10 cursor-pointer disabled:opacity-50 shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/title w-full h-9 my-1">
                              <CardTitle className="text-base font-bold text-foreground leading-none tracking-tight truncate flex-1 select-none">
                                {session.title}
                              </CardTitle>
                              <button
                                onClick={() => handleStartRename(session)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover/title:opacity-100 transition-opacity cursor-pointer shrink-0"
                                title={t("practiceList.rename")}
                              >
                                <PenNewSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* AI generated summary / contents */}
                          <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-3 select-none">
                            {session.topic || session.jobDescription
                              ? t("practiceList.topicSummary", {
                                  topic: session.topic || t("practiceList.defaultJdTopic"),
                                })
                              : t("practiceList.autoSummary")
                            }
                          </p>
                        </div>
                      </div>

                      {/* Bottom content block */}
                      <div className="w-full">
                        {/* Session Statistics Grid */}
                        <div className="grid grid-cols-3 gap-2 border-t border-b border-border/5 py-3 mb-5 mt-2">
                          {/* Attempts */}
                          <div className="text-center">
                            <span className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceList.attempts")}</span>
                            <span className="block text-sm font-black text-foreground mt-1 select-none">
                              {session.attemptCount || 0}
                            </span>
                          </div>

                          {/* Highest Score */}
                          <div className="text-center border-x border-border/10">
                            <span className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceList.highestScore")}</span>
                            <span className="block text-sm font-black text-emerald-500 mt-1 select-none">
                              {hasPracticed ? `${session.highestScore}` : "0"}
                              <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                            </span>
                          </div>

                          {/* Average Score */}
                          <div className="text-center">
                            <span className="block text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceList.averageScore")}</span>
                            <span className="block text-sm font-black text-amber-500 mt-1 select-none">
                              {hasPracticed 
                                ? `${((session.highestScore + (session.latestResult?.score || 0)) / 2).toFixed(1)}` 
                                : "0.0"}
                              <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                            </span>
                          </div>
                        </div>

                        {/* Actions button */}
                        <div className="flex items-center gap-2.5">
                          <Button
                            onClick={() => router.push(`/practice/${session.id}`)}
                            className="flex-1 rounded-2xl py-4 text-xs font-extrabold shadow-sm bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {t("practiceList.practiceNow")}
                          </Button>
                          
                          <Button
                            variant="outline"
                            disabled={!hasPracticed}
                            onClick={(e) => handleOpenResult(session, e)}
                            className="flex-1 rounded-2xl py-4 text-xs font-bold border border-border/20 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/10 cursor-pointer"
                          >
                            {t("practiceList.latestResult")}
                          </Button>
                        </div>
                      </div>

                    </Card>
                  ) : (
                    <Card className="border border-border/10 hover:border-primary/30 bg-card/40 hover:bg-card/60 backdrop-blur-md shadow-sm hover:shadow-md hover:shadow-primary/5 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6 overflow-hidden rounded-[24px] p-5 text-left w-full animate-in fade-in duration-200">
                      {/* Left: Info & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase shrink-0 ${getIndustryBadgeColor(session.industry)}`}>
                            {session.industry ? translateIndustry(t, session.industry) : t("practiceList.industryFallback")}
                          </span>
                        </div>

                        {isRenaming ? (
                          <div className="flex items-center gap-1.5 w-full max-w-md h-9 my-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRename(session.id);
                                  if (e.key === "Escape") setEditingSessionId(null);
                              }}
                              className="bg-card border border-primary/50 text-foreground text-sm font-bold rounded-xl px-2.5 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-primary w-full"
                              autoFocus
                              disabled={isSavingRename}
                            />
                            <button
                              onClick={() => handleSaveRename(session.id)}
                              disabled={isSavingRename}
                              className="p-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/10 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              disabled={isSavingRename}
                              className="p-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/title w-full h-9 my-1">
                            <CardTitle className="text-base font-extrabold text-foreground leading-none tracking-tight truncate select-none">
                              {session.title}
                            </CardTitle>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover/title:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => handleStartRename(session)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                title={t("practiceList.rename")}
                              >
                                <PenNewSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClick(session, e)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-red-500 cursor-pointer"
                                title={t("practiceList.deleteTitle")}
                              >
                                <TrashBinMinimalistic className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1 truncate max-w-xl select-none">
                          {session.topic || session.jobDescription
                            ? t("practiceList.topicInline", {
                                topic: session.topic || t("practiceList.defaultJdTopic"),
                              })
                            : t("practiceList.autoSummary")
                          }
                        </p>
                      </div>

                      {/* Middle: 3 Stats Columns */}
                      <div className="grid grid-cols-3 gap-4 lg:gap-8 shrink-0 py-3 lg:py-0 border-y lg:border-y-0 border-border/5 lg:px-6 lg:border-x border-border/10">
                        <div className="text-center lg:text-left min-w-[70px]">
                          <span className="block text-[8px] lg:text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceList.attempts")}</span>
                          <span className="block text-sm lg:text-base font-black text-foreground mt-0.5 select-none">
                            {session.attemptCount || 0}
                          </span>
                        </div>
                        
                        <div className="text-center lg:text-left min-w-[80px]">
                          <span className="block text-[8px] lg:text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceList.highestScore")}</span>
                          <span className="block text-sm lg:text-base font-black text-emerald-500 mt-0.5 select-none">
                            {hasPracticed ? `${session.highestScore}` : "0"}
                            <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                          </span>
                        </div>

                        <div className="text-center lg:text-left min-w-[80px]">
                          <span className="block text-[8px] lg:text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">{t("practiceList.averageScore")}</span>
                          <span className="block text-sm lg:text-base font-black text-amber-500 mt-0.5 select-none">
                            {hasPracticed 
                              ? `${((session.highestScore + (session.latestResult?.score || 0)) / 2).toFixed(1)}` 
                              : "0.0"}
                            <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row items-center gap-2.5 shrink-0 lg:w-[280px]">
                        <Button
                          onClick={() => router.push(`/practice/${session.id}`)}
                          className="flex-1 rounded-xl py-4 text-xs font-extrabold shadow-sm bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {t("practiceList.practiceNow")}
                        </Button>
                        
                        <Button
                          variant="outline"
                          disabled={!hasPracticed}
                          onClick={(e) => handleOpenResult(session, e)}
                          className="flex-1 rounded-xl py-4 text-xs font-bold border border-border/20 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/10 cursor-pointer"
                        >
                          {t("practiceList.latestResult")}
                        </Button>
                      </div>

                    </Card>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Creation Dialog */}
      <CreatePracticeDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Result Drawer */}
      {selectedSessionForResult && (
        <ResultPracticeDrawer
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          title={selectedSessionForResult.title}
          resultData={selectedSessionForResult.latestResult}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={sessionToDelete?.title}
        isSubmitting={isDeleting}
      />
      </motion.div>
    </div>
  );
}
