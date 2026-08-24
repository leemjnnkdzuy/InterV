"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { logo } from "@/app/assets";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/hooks/useLanguage";
import { userService } from "@/app/services";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Spinner } from "@/app/components/ui/spinner";
import { DatePickerInput } from "@/app/components/ui/date-picker";
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
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto redirect if user has already completed onboarding
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace("/login?redirect=/onboarding");
      } else if (user?.isOnboarded && currentStep !== 5) {
        router.replace("/");
      }
    }
  }, [loading, isAuthenticated, user?.isOnboarded, currentStep, router]);

  // Form State initialized directly from user state
  const [fullName, setFullName] = useState<string>(() => user?.fullName || "");
  const [dob, setDob] = useState<Date | undefined>(() => {
    if (!user?.dob) return undefined;
    const d = new Date(user.dob);
    return Number.isNaN(d.getTime()) ? undefined : d;
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

  const handleStep3Next = () => {
    setDirection(1);
    setCurrentStep(4);
  };

  // Step 4: CV Upload handlers
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

  // Step 4: Complete Onboarding & Save
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const cleanEducation = educationList.filter((e) => e.school.trim() !== "");
      const cleanExperience = experienceList.filter((exp) => exp.company.trim() !== "" || exp.role.trim() !== "");
      const cleanBirthYear = dob ? dob.getFullYear() : undefined;

      const payload = {
        fullName: fullName.trim(),
        dob: dob ? dob.toISOString() : undefined,
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
        await refreshUser();
        setDirection(1);
        setCurrentStep(5);
      } else {
        toast.error(res.message || t("onboarding.saveFailed"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("onboarding.saveFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || (user?.isOnboarded && currentStep !== 5)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background text-foreground flex flex-col justify-between overflow-x-hidden selection:bg-[var(--chart-1)]/30 selection:text-[var(--chart-1)]">
      <SilkBackground />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 sm:px-10 py-5 flex items-center justify-between">
        {/* Top-Left: InterV Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <Image
              src={logo}
              alt="InterV Logo"
              width={32}
              height={32}
              className="invert dark:invert-0 object-contain"
              priority
            />
          </div>
          <span className="font-logo text-2xl font-bold tracking-tight text-foreground">
            InterV<span className="text-primary">.</span>
          </span>
        </div>

        {/* Top-Right: Logout Button */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full border-border/50 cursor-pointer px-4 py-1.5"
            >
              <span>Đăng xuất</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center items-center">
        {/* Phase Content Area with Framer Motion slide */}
        <div className="w-full relative rounded-3xl bg-[var(--sidebar)]/85 dark:bg-[var(--sidebar)]/75 border border-border/40 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* PHASE 1: PERSONAL INFORMATION */}
            {currentStep === 1 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {t("onboarding.step1Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Thông tin cơ bản để AI cá nhân hóa cách xưng hô và chuẩn bị hồ sơ ứng viên.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  {/* Full Name */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{t("onboarding.fullNameLabel")}</span>
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("onboarding.fullNamePlaceholder")}
                        className="rounded-2xl border-border/50 bg-background/50 h-12 px-4 text-sm focus:border-primary focus:ring-primary"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Birth Date / Date of birth */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      <span>{t("onboarding.birthYearLabel")}</span>
                    </label>
                    <DatePickerInput
                      value={dob}
                      onChange={(date) => setDob(date)}
                      placeholder={t("onboarding.birthYearPlaceholder")}
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{t("onboarding.genderLabel")}</span>
                      <span className="text-destructive font-bold">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "male", label: t("onboarding.genderMale") },
                        { id: "female", label: t("onboarding.genderFemale") },
                        { id: "other", label: t("onboarding.genderOther") },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGender(item.id as UserGender)}
                          className={`h-12 rounded-2xl border flex items-center justify-center text-sm font-semibold transition-all cursor-pointer ${
                            gender === item.id
                              ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                              : "bg-muted/25 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Headline / Title */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      {t("onboarding.headlineLabel")}
                    </label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder={t("onboarding.headlinePlaceholder")}
                      className="rounded-2xl border-border/50 bg-background/50 h-12 px-4 text-sm"
                    />
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div className="pt-6 flex items-center justify-end">
                  <Button
                    type="button"
                    onClick={handleStep1Next}
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-7 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
                  >
                    <span>{t("onboarding.btnNext")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ) : currentStep === 2 ? (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {t("onboarding.step2Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Thông tin trường học và chuyên ngành giúp AI cá nhân hóa mức độ chuyên sâu của câu hỏi.
                  </p>
                </div>

                {/* Education List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      <span>{t("onboarding.educationSection")}</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddEducation}
                      className="rounded-full text-xs border-border/50 bg-background/50 hover:bg-muted h-8 px-3 cursor-pointer"
                    >
                      <span>{t("onboarding.addEducation")}</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {educationList.map((edu, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-border/40 bg-muted/20 p-4 relative space-y-3"
                      >
                        {educationList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEducation(idx)}
                            className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-red-500 transition-colors p-1"
                            title="Xóa mục này"
                          >
                            Xóa
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.schoolNameLabel")}
                            </label>
                            <Input
                              value={edu.school}
                              onChange={(e) => handleUpdateEducation(idx, "school", e.target.value)}
                              placeholder={t("onboarding.schoolNamePlaceholder")}
                              className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.majorLabel")}
                            </label>
                            <Input
                              value={edu.major || ""}
                              onChange={(e) => handleUpdateEducation(idx, "major", e.target.value)}
                              placeholder={t("onboarding.majorPlaceholder")}
                              className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.degreeLabel")}
                            </label>
                            <Select
                              value={edu.degree || "Cử nhân"}
                              onValueChange={(val) => handleUpdateEducation(idx, "degree", val)}
                            >
                              <SelectTrigger className="w-full h-10 rounded-xl border-border/50 bg-background/60 px-3 text-xs flex items-center justify-between cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" className="bg-popover border border-border">
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
                              <label className="text-[11px] text-muted-foreground">
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
                                className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-muted-foreground">
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
                                className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                    className="rounded-full text-muted-foreground hover:text-foreground px-6 py-2 text-sm cursor-pointer"
                  >
                    <span>{t("onboarding.btnBack")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleStep2Next}
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-7 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
                  >
                    <span>{t("onboarding.btnNext")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ) : currentStep === 3 ? (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {t("onboarding.step3Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Cung cấp kinh nghiệm thực tế và kỹ năng cốt lõi để AI xây dựng các tình huống phỏng vấn sát thực tế.
                  </p>
                </div>

                {/* Section A: Work Experience */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      <span>{t("onboarding.experienceSection")}</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleStudent}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isStudentOrFresher
                            ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t("onboarding.studentPreset")}
                      </button>
                      {!isStudentOrFresher && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddExperience}
                          className="rounded-full text-xs border-border/50 bg-background/50 hover:bg-muted h-8 px-3 cursor-pointer"
                        >
                          <span>{t("onboarding.addExperience")}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {experienceList.map((exp, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-border/40 bg-muted/20 p-4 relative space-y-3"
                      >
                        {experienceList.length > 1 && !isStudentOrFresher && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(idx)}
                            className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-red-500 transition-colors p-1"
                            title="Xóa mục này"
                          >
                            Xóa
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.companyLabel")}
                            </label>
                            <Input
                              value={exp.company}
                              onChange={(e) => handleUpdateExperience(idx, "company", e.target.value)}
                              placeholder={t("onboarding.companyPlaceholder")}
                              className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.roleLabel")}
                            </label>
                            <Input
                              value={exp.role}
                              onChange={(e) => handleUpdateExperience(idx, "role", e.target.value)}
                              placeholder={t("onboarding.rolePlaceholder")}
                              className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-12 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.durationLabel")}
                            </label>
                            <Input
                              value={exp.duration || ""}
                              onChange={(e) => handleUpdateExperience(idx, "duration", e.target.value)}
                              placeholder={t("onboarding.durationPlaceholder")}
                              className="rounded-xl border-border/50 bg-background/60 h-10 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-12 space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {t("onboarding.descriptionLabel")}
                            </label>
                            <Textarea
                              value={exp.description || ""}
                              onChange={(e) => handleUpdateExperience(idx, "description", e.target.value)}
                              placeholder={t("onboarding.descriptionPlaceholder")}
                              className="rounded-xl border-border/50 bg-background/60 text-xs min-h-[60px] resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section B: Core Skills */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-foreground">
                    <span>{t("onboarding.skillsSection")}</span>
                  </h3>

                  <div className="space-y-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleKeyDownSkill}
                      placeholder={t("onboarding.skillsPlaceholder")}
                      className="rounded-2xl border-border/50 bg-background/50 h-11 px-4 text-xs focus:border-primary focus:ring-primary"
                    />

                    {/* Selected skill chips */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-foreground text-xs leading-none font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggested skill chips */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] text-muted-foreground">{t("onboarding.skillsHint")}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 10).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleAddSkill(s)}
                            className="text-xs px-2.5 py-1 rounded-full bg-muted/40 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
                          >
                            {s}
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
                      setCurrentStep(2);
                    }}
                    className="rounded-full text-muted-foreground hover:text-foreground px-6 py-2 text-sm cursor-pointer"
                  >
                    <span>{t("onboarding.btnBack")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleStep3Next}
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-7 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
                  >
                    <span>{t("onboarding.btnNext")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ) : currentStep === 4 ? (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 40 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {t("onboarding.step4Title")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Tải lên CV (nếu có) và xác định mục tiêu phỏng vấn để AI thiết lập buổi luyện tập chuẩn xác.
                  </p>
                </div>

                {/* Target Role & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      {t("onboarding.targetRoleLabel")}
                    </label>
                    <Input
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder={t("onboarding.targetRolePlaceholder")}
                      className="rounded-2xl border-border/50 bg-background/50 h-12 px-4 text-sm focus:border-primary focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      {t("onboarding.targetIndustryLabel")}
                    </label>
                    <Select
                      value={targetIndustry}
                      onValueChange={(val) => setTargetIndustry(val)}
                    >
                      <SelectTrigger className="w-full h-12 rounded-2xl border-border/50 bg-background/50 px-4 text-sm flex items-center justify-between cursor-pointer focus:border-primary focus:ring-primary">
                        <SelectValue placeholder={t("onboarding.selectIndustry")} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-popover border border-border max-h-64">
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
                  <label className="text-xs font-semibold text-foreground">
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
                    <div className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-5 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{cvFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(cvFile.size / 1024).toFixed(1)} KB • Đã sẵn sàng phân tích
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCvFile(null)}
                          className="rounded-full text-xs text-red-500 dark:text-red-400 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
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
                          ? "border-primary bg-primary/[0.08]"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <p className="text-sm font-bold text-foreground">
                        {t("onboarding.cvDropzoneTitle")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("onboarding.cvDropzoneSubtitle")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 rounded-full text-xs border-border/50 bg-background/70 hover:bg-muted text-foreground cursor-pointer"
                      >
                        {t("onboarding.cvDropzoneAction")}
                      </Button>
                    </div>
                  )}

                  {!cvFile && (
                    <p className="text-xs text-muted-foreground text-center italic">
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
                      setCurrentStep(3);
                    }}
                    className="rounded-full text-muted-foreground hover:text-foreground px-6 py-2 text-sm cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <span>{t("onboarding.btnBack")}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 h-auto text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
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
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : currentStep === 5 ? (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-6 py-2"
              >
                {/* Celebration Header */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                    {t("onboarding.step5Title")}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Hồ sơ năng lực của bạn đã được thiết lập hoàn tất. Các câu hỏi phỏng vấn AI giờ đây sẽ sát nhất với kinh nghiệm thực tế của bạn.
                  </p>
                </div>

                {/* Candidate Summary Card */}
                <div className="rounded-3xl border border-border/40 bg-muted/20 p-6 space-y-5">
                  <div className="flex items-center gap-4 border-b border-border/30 pb-5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-primary/30 to-purple-500/30 border border-border/40 flex items-center justify-center text-xl font-bold text-foreground shrink-0 relative">
                      {user?.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={fullName || user?.username || "Avatar"}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span>{fullName ? fullName.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || "U"}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        <span>{fullName || user?.username}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {headline || targetRole || "Ứng viên tiềm năng"} • {targetIndustry}
                      </p>
                    </div>
                  </div>

                  {/* Bonus Credits Card */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {t("onboarding.bonusCredits")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("onboarding.bonusCreditsDesc")}
                      </p>
                    </div>
                  </div>

                  {/* Skills Snapshot */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground">Kỹ năng đánh giá:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-full bg-muted/40 border border-border/40 text-xs text-foreground font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg mx-auto">
                  <Button
                    type="button"
                    onClick={() => router.push("/practice")}
                    className="w-full sm:flex-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3.5 h-12 text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
                  >
                    <span>{t("onboarding.btnStartPractice")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/")}
                    className="w-full sm:flex-1 rounded-full border-border/50 bg-background/50 hover:bg-muted text-foreground font-semibold px-6 py-3.5 h-12 text-sm flex items-center justify-center cursor-pointer"
                  >
                    <span>{t("onboarding.btnGoDashboard")}</span>
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 sm:px-10 py-4 flex flex-wrap items-center justify-end gap-3 sm:gap-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} InterV AI. All rights reserved.</span>
        <span className="opacity-30">•</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/privacy")}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Bảo mật
          </button>
          <button
            type="button"
            onClick={() => router.push("/terms")}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Điều khoản
          </button>
        </div>
      </footer>
    </div>
  );
}
