"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/ui/button";
import {
  Card,
} from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import {
  AltArrowLeft,
  Camera,
  Calendar,
  User,
} from "@solar-icons/react";
import { toast } from "sonner";
import { userService } from "@/app/services";
import { DatePicker } from "@/app/components/ui/date-picker";
import { useLanguage } from "@/app/hooks/useLanguage";

interface ProfilePageProps {
  targetUsername?: string;
}

export default function ProfilePage({ targetUsername }: ProfilePageProps = {}) {
  const router = useRouter();
  const { user, refreshUser } = useAuthContext();
  const { language, t } = useLanguage();

  const [profileUser, setProfileUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const isOwnProfile = React.useMemo(() => {
    if (!targetUsername) return true;
    return user?.username?.toLowerCase() === targetUsername.toLowerCase();
  }, [targetUsername, user]);

  React.useEffect(() => {
    if (isOwnProfile) {
      if (user) {
        setLoading(false);
        setError(null);
      } else {
        setLoading(true);
      }
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedUser = await userService.getProfileByUsername(targetUsername!);
        setProfileUser(fetchedUser);
      } catch (err: any) {
        setError(err.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUsername, isOwnProfile, user, t]);

  const handleUpdateDob = async (newDate: Date) => {
    try {
      const response = await userService.updateProfile({ dob: newDate });
      if (response.success) {
        toast.success(t("profile.updateDobSuccess"));
        await refreshUser();
        // If we are viewing own profile as targetUsername
        if (targetUsername) {
          setProfileUser(response.user);
        }
      } else {
        toast.error(response.message || t("profile.updateDobFailed"));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common.error"));
      throw err;
    }
  };

  const handleAvatarChange = () => {
    if (!isOwnProfile) return;
    toast.info(t("profile.avatarPending"));
  };

  const displayedUser = isOwnProfile ? user : profileUser;

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !displayedUser) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-12 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error || t("profile.userNotFound")}</p>
        <Button onClick={() => router.push("/")} variant="outline" className="rounded-full cursor-pointer">
          {t("profile.backToHome")}
        </Button>
      </div>
    );
  }

  const creationDate = displayedUser.createdAt
    ? new Date(displayedUser.createdAt).toLocaleDateString(
        language === "vi" ? "vi-VN" : language === "zh" ? "zh-CN" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : t("common.error");

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Header section with back button */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="rounded-full flex items-center gap-2 border-border/40 hover:bg-muted/50 cursor-pointer"
        >
          <AltArrowLeft className="w-5 h-5" />
          <span>{t("common.home")}</span>
        </Button>
        <h1 className="font-logo text-xl font-bold tracking-tight text-foreground">
          InterV<span className="text-[var(--chart-1)]">.</span>
        </h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Avatar Summary Card */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="flex flex-col items-start">
            {/* Avatar Circle with Glow */}
            <div 
              className={`relative ${isOwnProfile ? "group/avatar cursor-pointer" : ""}`} 
              onClick={isOwnProfile ? handleAvatarChange : undefined}
            >
              <div className={`relative w-32 h-32 rounded-3xl p-1 bg-gradient-to-tr from-primary/40 via-violet-500/40 to-primary-foreground/40 shadow-xl transition-all duration-300 ${isOwnProfile ? "group-hover/avatar:scale-105" : ""}`}>
                <div className="w-full h-full rounded-2xl bg-sidebar-accent text-sidebar-accent-foreground font-bold text-4xl flex items-center justify-center border border-border/20 overflow-hidden shadow-inner relative">
                  {displayedUser.avatar ? (
                    <img
                      src={displayedUser.avatar}
                      alt={displayedUser.username}
                      className={`h-full w-full object-cover transition-transform duration-500 ${isOwnProfile ? "group-hover/avatar:scale-110" : ""}`}
                    />
                  ) : (
                    <span className="bg-gradient-to-tr from-[var(--chart-1)] to-[var(--chart-2)] bg-clip-text text-transparent">
                      {displayedUser.username ? displayedUser.username.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                  {/* Photo Edit Overlay */}
                  {isOwnProfile && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="text-left mt-4 w-full">
              <h2 className="text-xl font-bold truncate">{displayedUser.username}</h2>
              <p className="text-sm text-muted-foreground truncate mt-1">{displayedUser.email}</p>
            </div>

            {/* Separator */}
            <div className="w-full h-[1px] bg-border/25 my-5" />

            {/* Join Date info */}
            <div className="w-full flex items-center gap-3 text-sm text-muted-foreground">
              <User className="w-5 h-5 text-[var(--chart-1)] shrink-0" />
              <span>{t("profile.memberSince")} <strong>{creationDate}</strong></span>
            </div>

            {/* Birthdate info */}
            <div className="w-full flex items-center justify-between text-sm text-muted-foreground mt-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--chart-1)] shrink-0" />
                <span>{t("profile.birthdate")} <strong>{displayedUser.dob
                  ? new Date(displayedUser.dob).toLocaleDateString(
                      language === "vi" ? "vi-VN" : language === "zh" ? "zh-CN" : "en-US",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }
                    )
                  : "--/--/----"}</strong></span>
              </div>
              {isOwnProfile && (
                <DatePicker value={displayedUser.dob} onConfirm={handleUpdateDob} />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Practice Statistics Card */}
        <div className="md:col-span-8">
          <Card className="border-none bg-card/40 backdrop-blur-md shadow-lg rounded-4xl p-6 min-h-[480px]">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold">{t("profile.practiceStats")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("profile.statsSub")}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/20 border border-border/10 rounded-3xl p-4 text-center">
                  <span className="text-3xl font-bold text-primary">12</span>
                  <span className="block text-xs text-muted-foreground mt-1">{t("profile.interviews")}</span>
                </div>
                <div className="bg-muted/20 border border-border/10 rounded-3xl p-4 text-center">
                  <span className="text-3xl font-bold text-violet-400">85%</span>
                  <span className="block text-xs text-muted-foreground mt-1">{t("profile.averageScore")}</span>
                </div>
                <div className="bg-muted/20 border border-border/10 rounded-3xl p-4 text-center">
                  <span className="text-3xl font-bold text-[var(--chart-1)]">3.2h</span>
                  <span className="block text-xs text-muted-foreground mt-1">{t("profile.practiceDuration")}</span>
                </div>
              </div>

              {/* Progress bars for skills */}
              <div className="space-y-5">
                <h4 className="text-sm font-semibold border-b border-border/10 pb-2">{t("profile.aiSkillEval")}</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("profile.communication")}</span>
                    <span className="text-primary font-bold">90%</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("profile.knowledge")}</span>
                    <span className="text-violet-400 font-bold">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("profile.problemSolving")}</span>
                    <span className="text-orange-400 font-bold">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("profile.confidence")}</span>
                    <span className="text-[var(--chart-1)] font-bold">88%</span>
                  </div>
                  <Progress value={88} className="h-2" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
