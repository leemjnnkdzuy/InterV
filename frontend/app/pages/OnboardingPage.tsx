"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  User as UserIcon,
  Calendar as CalendarIcon,
  Diploma,
  DocumentText,
  UploadMinimalistic,
  CheckCircle,
  AltArrowRight,
  AltArrowLeft,
  Stars,
  MedalStar,
  TrashBinMinimalistic,
} from "@solar-icons/react";
import {
  Plus,
  X,
  Check,
  GraduationCap,
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  LogOut,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useAuthContext } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/hooks/useLanguage";
import { userService } from "@/app/services";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Spinner } from "@/app/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import SilkBackground from "@/app/components/common/SilkBackground";
import { INDUSTRIES } from "@/app/contants";
import { getErrorMessage } from "@/app/lib/Utils";
import type {
  UserEducation,
  UserExperience,
  UserCvFile,
  UserGender,
} from "@/app/types";

const SUGGESTED_SKILLS = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "Java",
  "SQL",
  "Docker",
  "Git",
  "Giao tiếp",
  "Làm việc nhóm",
  "Quản lý dự án",
  "Figma",
  "Marketing",
  "Data Analysis",
  "Problem Solving",
];

const DEGREE_OPTIONS = [
  { id: "Cử nhân", labelKey: "degreeBachelor" },
  { id: "Kỹ sư", labelKey: "degreeEngineer" },
  { id: "Thạc sĩ", labelKey: "degreeMaster" },
  { id: "Cao đẳng", labelKey: "degreeCollege" },
  { id: "Khác", labelKey: "degreeOther" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, refreshUser, logout } = useAuthContext();
  const { language, t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Form State initialized directly from user state
  const [fullName, setFullName] = useState<string>(() => user?.fullName || "");
  const [birthYear, setBirthYear] = useState<string>(() => {
    if (!user?.dob) return "";
    const y = new Date(user.dob).getFullYear();
    return Number.isNaN(y) ? "" : y.toString();
  });
  const [gender, setGender] = useState<UserGender>(() => user?.gender || "");
  const [headline, setHeadline] = useState<string>(() => user?.headline || "");

  const [educationList, setEducationList] = useState<UserEducation[]>(
    () =>
      user?.education && user.education.length > 0
        ? user.education
        : [{ school: "", major: "", degree: "Cử nhân", startYear: undefined, endYear: undefined }]
  );
  const [experienceList, setExperienceList] = useState<UserExperience[]>(
    () =>
      user?.workExperience && user.workExperience.length > 0
        ? user.workExperience
        : [{ company: "", role: "", duration: "", description: "" }]
  );
  const [isStudentOrFresher, setIsStudentOrFresher] = useState<boolean>(false);

  const [skills, setSkills] = useState<string[]>(() => user?.skills || []);
  const [skillInput, setSkillInput] = useState<string>("");

  const [cvFile, setCvFile] = useState<UserCvFile | null>(() => user?.cvFile || null);
  const [targetRole, setTargetRole] = useState<string>(() => user?.targetRole || "");
  const [targetIndustry, setTargetIndustry] = useState<string>(
    () => user?.targetIndustry || "Công nghệ thông tin"
  );

  const [isDraggingCv, setIsDraggingCv] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Host prompt depending on step
  const aiPrompt = useMemo(() => {
    switch (currentStep) {
      case 1:
        return t("onboarding.aiPhase1Prompt");
      case 2:
        return t("onboarding.aiPhase2Prompt");
      case 3:
        return t("onboarding.aiPhase3Prompt");
      case 4:
        return t("onboarding.aiPhase4Prompt");
      default:
        return "";
    }
  }, [currentStep, t]);

  // Optional Voice speech on prompt change
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && ttsEnabled && aiPrompt) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiPrompt);
        utterance.lang = language === "vi" ? "vi-VN" : language === "zh" ? "zh-CN" : "en-US";
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        // Subtle volume to avoid loudness
        utterance.volume = 0.6;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore synthesis errors
      }
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [aiPrompt, ttsEnabled, language]);

  // Step 1: Validation & Advance
  const handleStep1Next = () => {
    if (!fullName.trim()) {
      toast.error(t("onboarding.validateFullName"));
      return;
    }
    if (!gender) {
      toast.error(t("onboarding.validateGender"));
      return;
    }
    setDirection(1);
    setCurrentStep(2);
  };

  // Step 2: Education & Experience handlers
  const handleAddEducation = () => {
    setEducationList((prev) => [
      ...prev,
      { school: "", major: "", degree: "Cử nhân", startYear: undefined, endYear: undefined },
    ]);
  };

  const handleRemoveEducation = (index: number) => {
    if (educationList.length <= 1) {
      setEducationList([{ school: "", major: "", degree: "Cử nhân" }]);
      return;
    }
    setEducationList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEducation = (index: number, field: keyof UserEducation, value: unknown) => {
    setEducationList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddExperience = () => {
    setExperienceList((prev) => [
      ...prev,
      { company: "", role: "", duration: "", description: "" },
    ]);
  };

  const handleRemoveExperience = (index: number) => {
    if (experienceList.length <= 1) {
      setExperienceList([{ company: "", role: "", duration: "", description: "" }]);
      return;
    }
    setExperienceList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExperience = (index: number, field: keyof UserExperience, value: string) => {
    setExperienceList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleToggleStudent = () => {
    const nextVal = !isStudentOrFresher;
    setIsStudentOrFresher(nextVal);
    if (nextVal) {
      setExperienceList([
        {
          company: "Sinh viên / Chưa có kinh nghiệm làm việc chính thức",
          role: "Fresher / Entry-level",
          duration: "Hiện tại",
          description: "Tập trung học tập, tham gia các dự án môn học, đồ án tốt nghiệp và hoạt động ngoại khóa.",
        },
      ]);
    }
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleKeyDownSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill(skillInput);
    }
  };

  const handleStep2Next = () => {
    setDirection(1);
    setCurrentStep(3);
  };

  // Step 3: CV Upload handlers
  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("onboarding.cvDropzoneSubtitle"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setCvFile({
        name: file.name,
        size: file.size,
        data: base64Data,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(t("onboarding.cvUploadedSuccess"));
    };
    reader.readAsDataURL(file);
  };

  const handleDropCv = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCv(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Step 3: Complete Onboarding & Save
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const cleanEducation = educationList.filter((e) => e.school.trim() !== "");
      const cleanExperience = experienceList.filter((exp) => exp.company.trim() !== "" || exp.role.trim() !== "");
      const cleanBirthYear = birthYear ? parseInt(birthYear, 10) : undefined;

      const payload = {
        fullName: fullName.trim(),
        birthYear: cleanBirthYear,
        gender,
        headline: headline.trim(),
        education: cleanEducation,
        workExperience: cleanExperience,
        skills,
        cvFile: cvFile || undefined,
        targetRole: targetRole.trim(),
        targetIndustry: targetIndustry.trim(),
      };

      const res = await userService.completeOnboarding(payload);
      if (res.success) {
        toast.success(t("onboarding.saveSuccess"));
        await refreshUser();
        setDirection(1);
        setCurrentStep(4);
      } else {
        toast.error(res.message || t("onboarding.saveFailed"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("onboarding.saveFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const stepPills = [
    { num: 1, label: t("onboarding.step1Short") },
    { num: 2, label: t("onboarding.step2Short") },
    { num: 3, label: t("onboarding.step3Short") },
    { num: 4, label: t("onboarding.step4Short") },
  ];

  return (
    <div className="min-h-screen relative bg-background text-foreground flex flex-col justify-between overflow-x-hidden selection:bg-[var(--chart-1)]/30 selection:text-[var(--chart-1)]">
      <SilkBackground />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[var(--chart-1)] to-[var(--chart-2)] p-0.5 shadow-lg shadow-[var(--chart-1)]/20 flex items-center justify-center">
            <span className="font-logo font-black text-zinc-950 text-xl">V</span>
          </div>
          <span className="font-logo text-xl font-extrabold tracking-tight text-foreground">
            InterV<span className="text-[var(--chart-1)]">.</span>
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--chart-1)]/10 text-[var(--chart-1)] border border-[var(--chart-1)]/20 ml-2">
            AI Onboarding Interview
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              ttsEnabled
                ? "bg-[var(--chart-1)]/10 border-[var(--chart-1)]/30 text-[var(--chart-1)]"
                : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground"
            }`}
            title={t("onboarding.audioTtsToggle")}
            aria-label="Toggle AI Voice"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-xs text-muted-foreground hover:text-destructive rounded-full gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col">
        {/* Step Progress Header */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto">
            {stepPills.map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <div
                  key={step.num}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                    isActive
                      ? "bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(187,244,81,0.15)]"
                      : isPast
                      ? "bg-muted/20 border-emerald-500/30 text-emerald-400"
                      : "bg-muted/10 border-border/30 text-muted-foreground opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {isPast ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span>0{step.num}</span>
                    )}
                    <span className="hidden md:inline truncate">{step.label}</span>
                  </div>
                  <div
                    className={`w-full h-1 rounded-full transition-all ${
                      isActive
                        ? "bg-[var(--chart-1)]"
                        : isPast
                        ? "bg-emerald-400"
                        : "bg-border/30"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Interviewer Persona Card */}
        <div className="relative mb-6 rounded-3xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl p-4 sm:p-6 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--chart-1)]/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* AI Avatar with pulse ring */}
            <div className="relative shrink-0">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-[var(--chart-1)] to-purple-500 shadow-lg">
                <div className="w-full h-full rounded-[14px] bg-zinc-900 overflow-hidden flex items-center justify-center relative">
                  <div className="w-full h-full bg-gradient-to-tr from-pink-500/20 to-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xl">
                    <Stars className="w-8 h-8 text-[var(--chart-1)] animate-pulse" />
                  </div>
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--chart-1)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[var(--chart-1)] border-2 border-zinc-950"></span>
              </span>
            </div>

            {/* AI Speech Bubble */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-white">Elena</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium">
                  {t("onboarding.aiHostRole")}
                </span>
                {ttsEnabled && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--chart-1)] ml-auto font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--chart-1)] animate-ping" />
                    AI Voice Active
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={aiPrompt}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm sm:text-base text-zinc-200 leading-relaxed font-normal"
                >
                  {aiPrompt}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Phase Content Area with Framer Motion slide */}
        <div className="relative rounded-3xl bg-[var(--sidebar)]/75 border border-zinc-800/60 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl mb-8 flex-1 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* PHASE 1: PERSONAL INFORMATION */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                    <UserIcon className="w-6 h-6 text-[var(--chart-1)]" />
                    {t("onboarding.step1Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Thông tin cơ bản để AI cá nhân hóa cách xưng hô và chuẩn bị hồ sơ ứng viên.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  {/* Full Name */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <span>{t("onboarding.fullNameLabel")}</span>
                      <span className="text-[var(--chart-1)]">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("onboarding.fullNamePlaceholder")}
                        className="rounded-2xl border-white/10 bg-white/5 h-12 px-4 text-sm focus:border-[var(--chart-1)] focus:ring-[var(--chart-1)]"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Birth Year / Date */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[var(--chart-1)]" />
                      <span>{t("onboarding.birthYearLabel")}</span>
                    </label>
                    <Select
                      value={birthYear}
                      onValueChange={(val) => setBirthYear(val)}
                    >
                      <SelectTrigger className="rounded-2xl border-white/10 bg-white/5 h-12 px-4 text-sm">
                        <SelectValue placeholder={t("onboarding.birthYearPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-zinc-950 border border-zinc-800 max-h-60">
                        {Array.from({ length: 45 }, (_, i) => 2008 - i).map((year) => (
                          <SelectItem key={year} value={year.toString()} className="cursor-pointer text-sm">
                            {year} ({new Date().getFullYear() - year} tuổi)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <span>{t("onboarding.genderLabel")}</span>
                      <span className="text-[var(--chart-1)]">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "male", label: t("onboarding.genderMale"), emoji: "👨" },
                        { id: "female", label: t("onboarding.genderFemale"), emoji: "👩" },
                        { id: "other", label: t("onboarding.genderOther"), emoji: "✨" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGender(item.id as UserGender)}
                          className={`h-12 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                            gender === item.id
                              ? "bg-[var(--chart-1)]/15 border-[var(--chart-1)] text-[var(--chart-1)] shadow-sm"
                              : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Headline / Title */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      {t("onboarding.headlineLabel")}
                    </label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder={t("onboarding.headlinePlaceholder")}
                      className="rounded-2xl border-white/10 bg-white/5 h-12 px-4 text-sm"
                    />
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div className="pt-6 flex items-center justify-end">
                  <Button
                    type="button"
                    onClick={handleStep1Next}
                    className="rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-7 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--chart-1)]/20"
                  >
                    <span>{t("onboarding.btnNext")}</span>
                    <AltArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PHASE 2: EDUCATION & EXPERIENCE */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                    <Diploma className="w-6 h-6 text-[var(--chart-1)]" />
                    {t("onboarding.step2Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Cung cấp học vấn và kinh nghiệm để AI mô phỏng đúng trình độ chuyên môn của bạn.
                  </p>
                </div>

                {/* Section A: Education */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[var(--chart-1)]" />
                      <span>{t("onboarding.educationSection")}</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddEducation}
                      className="rounded-full text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-1.5 h-8 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t("onboarding.addEducation")}</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {educationList.map((edu, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 relative space-y-3"
                      >
                        {educationList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEducation(idx)}
                            className="absolute top-3 right-3 text-zinc-500 hover:text-red-400 transition-colors p-1"
                            title="Xóa mục này"
                          >
                            <TrashBinMinimalistic className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.schoolNameLabel")}
                            </label>
                            <Input
                              value={edu.school}
                              onChange={(e) => handleUpdateEducation(idx, "school", e.target.value)}
                              placeholder={t("onboarding.schoolNamePlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.majorLabel")}
                            </label>
                            <Input
                              value={edu.major || ""}
                              onChange={(e) => handleUpdateEducation(idx, "major", e.target.value)}
                              placeholder={t("onboarding.majorPlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.degreeLabel")}
                            </label>
                            <Select
                              value={edu.degree || "Cử nhân"}
                              onValueChange={(val) => handleUpdateEducation(idx, "degree", val)}
                            >
                              <SelectTrigger className="rounded-xl border-white/10 bg-white/5 h-10 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" className="bg-zinc-950 border border-zinc-800">
                                {DEGREE_OPTIONS.map((deg) => (
                                  <SelectItem key={deg.id} value={deg.id} className="text-xs">
                                    {t(`onboarding.${deg.labelKey}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] text-zinc-400">
                                {t("onboarding.startYearLabel")}
                              </label>
                              <Input
                                type="number"
                                value={edu.startYear || ""}
                                onChange={(e) =>
                                  handleUpdateEducation(
                                    idx,
                                    "startYear",
                                    e.target.value ? parseInt(e.target.value, 10) : undefined
                                  )
                                }
                                placeholder="2020"
                                className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-zinc-400">
                                {t("onboarding.endYearLabel")}
                              </label>
                              <Input
                                type="number"
                                value={edu.endYear || ""}
                                onChange={(e) =>
                                  handleUpdateEducation(
                                    idx,
                                    "endYear",
                                    e.target.value ? parseInt(e.target.value, 10) : undefined
                                  )
                                }
                                placeholder="2024"
                                className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section B: Work Experience */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[var(--chart-1)]" />
                      <span>{t("onboarding.experienceSection")}</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleStudent}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isStudentOrFresher
                            ? "bg-[var(--chart-1)]/15 border-[var(--chart-1)] text-[var(--chart-1)] font-semibold"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isStudentOrFresher ? "✓ " : "+ "}
                        {t("onboarding.studentPreset")}
                      </button>
                      {!isStudentOrFresher && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddExperience}
                          className="rounded-full text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-1.5 h-8 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t("onboarding.addExperience")}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {experienceList.map((exp, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 relative space-y-3"
                      >
                        {experienceList.length > 1 && !isStudentOrFresher && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(idx)}
                            className="absolute top-3 right-3 text-zinc-500 hover:text-red-400 transition-colors p-1"
                            title="Xóa mục này"
                          >
                            <TrashBinMinimalistic className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.companyLabel")}
                            </label>
                            <Input
                              value={exp.company}
                              onChange={(e) => handleUpdateExperience(idx, "company", e.target.value)}
                              placeholder={t("onboarding.companyPlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.roleLabel")}
                            </label>
                            <Input
                              value={exp.role}
                              onChange={(e) => handleUpdateExperience(idx, "role", e.target.value)}
                              placeholder={t("onboarding.rolePlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-12 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.durationLabel")}
                            </label>
                            <Input
                              value={exp.duration || ""}
                              onChange={(e) => handleUpdateExperience(idx, "duration", e.target.value)}
                              placeholder={t("onboarding.durationPlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-12 space-y-1">
                            <label className="text-[11px] text-zinc-400">
                              {t("onboarding.descriptionLabel")}
                            </label>
                            <Textarea
                              value={exp.description || ""}
                              onChange={(e) => handleUpdateExperience(idx, "description", e.target.value)}
                              placeholder={t("onboarding.descriptionPlaceholder")}
                              className="rounded-xl border-white/10 bg-white/5 text-xs min-h-[60px] resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section C: Core Skills */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--chart-1)]" />
                    <span>{t("onboarding.skillsSection")}</span>
                  </h3>

                  <div className="space-y-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleKeyDownSkill}
                      placeholder={t("onboarding.skillsPlaceholder")}
                      className="rounded-2xl border-white/10 bg-white/5 h-11 px-4 text-xs"
                    />

                    {/* Selected skill chips */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--chart-1)]/15 border border-[var(--chart-1)]/30 text-[var(--chart-1)] text-xs font-medium"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggested skill chips */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] text-zinc-400">{t("onboarding.skillsHint")}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 10).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleAddSkill(s)}
                            className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                          >
                            + {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div className="pt-6 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDirection(-1);
                      setCurrentStep(1);
                    }}
                    className="rounded-full text-zinc-400 hover:text-white px-5 py-2 text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <AltArrowLeft className="w-4 h-4" />
                    <span>{t("onboarding.btnBack")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleStep2Next}
                    className="rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-7 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--chart-1)]/20"
                  >
                    <span>{t("onboarding.btnNext")}</span>
                    <AltArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PHASE 3: CV UPLOAD & TARGET ROLE */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                    <DocumentText className="w-6 h-6 text-[var(--chart-1)]" />
                    {t("onboarding.step3Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Tải lên CV (nếu có) và xác định mục tiêu phỏng vấn để AI thiết lập buổi luyện tập chuẩn xác.
                  </p>
                </div>

                {/* Target Role & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      {t("onboarding.targetRoleLabel")}
                    </label>
                    <Input
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder={t("onboarding.targetRolePlaceholder")}
                      className="rounded-2xl border-white/10 bg-white/5 h-12 px-4 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      {t("onboarding.targetIndustryLabel")}
                    </label>
                    <Select
                      value={targetIndustry}
                      onValueChange={(val) => setTargetIndustry(val)}
                    >
                      <SelectTrigger className="rounded-2xl border-white/10 bg-white/5 h-12 px-4 text-sm">
                        <SelectValue placeholder={t("onboarding.selectIndustry")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-zinc-950 border border-zinc-800 max-h-64">
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind} className="cursor-pointer text-sm">
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CV Dropzone */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <span>{t("onboarding.cvSection")}</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.docx,.doc,image/*"
                    className="hidden"
                  />

                  {cvFile ? (
                    <div className="rounded-2xl border border-[rgba(187,244,81,0.3)] bg-[var(--chart-1)]/[0.05] p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[var(--chart-1)]/10 border border-[var(--chart-1)]/30 flex items-center justify-center shrink-0">
                          <FileCheck className="w-6 h-6 text-[var(--chart-1)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{cvFile.name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {(cvFile.size / 1024).toFixed(1)} KB • Đã sẵn sàng phân tích
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCvFile(null)}
                          className="rounded-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                        >
                          {t("onboarding.removeCv")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingCv(true);
                      }}
                      onDragLeave={() => setIsDraggingCv(false)}
                      onDrop={handleDropCv}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        isDraggingCv
                          ? "border-[var(--chart-1)] bg-[var(--chart-1)]/[0.08]"
                          : "border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                        <UploadMinimalistic className="w-7 h-7 text-[var(--chart-1)]" />
                      </div>
                      <p className="text-sm font-bold text-zinc-200">
                        {t("onboarding.cvDropzoneTitle")}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                        {t("onboarding.cvDropzoneSubtitle")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 rounded-full text-xs border-white/20 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                      >
                        {t("onboarding.cvDropzoneAction")}
                      </Button>
                    </div>
                  )}

                  {!cvFile && (
                    <p className="text-xs text-zinc-500 text-center italic">
                      {t("onboarding.skipCv")}
                    </p>
                  )}
                </div>

                {/* Bottom Navigation */}
                <div className="pt-6 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDirection(-1);
                      setCurrentStep(2);
                    }}
                    className="rounded-full text-zinc-400 hover:text-white px-5 py-2 text-sm flex items-center gap-2 cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <AltArrowLeft className="w-4 h-4" />
                    <span>{t("onboarding.btnBack")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    className="rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-8 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-[var(--chart-1)]/20"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="mr-2" />
                        <span>{t("onboarding.btnSaving")}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("onboarding.btnFinish")}</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PHASE 4: CELEBRATION & READY SUMMARY */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-6 py-2"
              >
                {/* Celebration Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 rounded-3xl bg-[var(--chart-1)]/10 border border-[var(--chart-1)]/30 text-[var(--chart-1)] shadow-xl shadow-[var(--chart-1)]/10 mb-2">
                    <MedalStar className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {t("onboarding.step4Title")}
                  </h2>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto">
                    Hồ sơ năng lực của bạn đã được thiết lập hoàn tất. Các câu hỏi phỏng vấn AI giờ đây sẽ sát nhất với kinh nghiệm thực tế của bạn.
                  </p>
                </div>

                {/* Candidate Summary Card */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--chart-1)]/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xl font-bold text-white">
                        {fullName ? fullName.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>{fullName || user?.username}</span>
                          <ShieldCheck className="w-4 h-4 text-[var(--chart-1)]" />
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {headline || targetRole || "Ứng viên tiềm năng"} • {targetIndustry}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center">
                        <span className="text-xs text-emerald-400 font-bold block">
                          {t("onboarding.readinessScore")}
                        </span>
                        <span className="text-xl font-black text-white">100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Bonus Credits Card */}
                  <div className="rounded-2xl border border-[rgba(187,244,81,0.2)] bg-[var(--chart-1)]/[0.06] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--chart-1)]/20 flex items-center justify-center">
                        <Stars className="w-5 h-5 text-[var(--chart-1)]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {t("onboarding.bonusCredits")}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {t("onboarding.bonusCreditsDesc")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Skills Snapshot */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-zinc-400">Kỹ năng đánh giá:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={() => router.push("/practice")}
                    className="w-full sm:w-auto rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold px-8 py-3.5 h-auto text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--chart-1)]/20"
                  >
                    <span>{t("onboarding.btnStartPractice")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/")}
                    className="w-full sm:w-auto rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3.5 h-auto text-sm cursor-pointer"
                  >
                    <span>{t("onboarding.btnGoDashboard")}</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-zinc-500">
        <span>© {new Date().getFullYear()} InterV AI. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/privacy")}
            className="hover:text-zinc-300 transition-colors"
          >
            Bảo mật
          </button>
          <button
            type="button"
            onClick={() => router.push("/terms")}
            className="hover:text-zinc-300 transition-colors"
          >
            Điều khoản
          </button>
        </div>
      </footer>
    </div>
  );
}
