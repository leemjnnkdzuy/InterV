"use client";

import { useCallback, useEffect, useState } from "react";
import { userService } from "@/app/services/UserService";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Monitor, Smartphone, ShieldKeyhole, TrashBinMinimalistic } from "@solar-icons/react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Spinner } from "@/app/components/ui/spinner";
import { cn, getErrorMessage } from "@/app/lib/Utils";
import { useLanguage } from "@/app/hooks/useLanguage";
import type { ApiErrorResponse, AuthSessionData } from "@/app/types";

export default function SecuritySettingsPage() {
  const { logout } = useAuthContext();
  const { language, t } = useLanguage();
  const [sessions, setSessions] = useState<AuthSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userService.getSessions();
      if (res.success) {
        setSessions(res.sessions);
      } else {
        toast.error(res.message || t("security.loadDevicesFailed"));
      }
    } catch {
      toast.error(t("security.loadDevicesError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSessions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const res = await userService.revokeSession(sessionId);
      if (res.success) {
        toast.success(t("security.revokeSuccess"));
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, isActive: false } : s))
        );
      } else {
        toast.error(res.message || t("security.revokeFailed"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("security.logoutError")));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm(t("security.logoutAllConfirm"))) {
      return;
    }
    try {
      setIsRevokingAll(true);
      const res = await userService.revokeAllSessions();
      if (res.success) {
        toast.success(t("security.revokeAllSuccess"));
        await logout();
      } else {
        toast.error(res.message || t("security.revokeAllFailed"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("security.revokeAllFailed")));
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string, isCurrent: boolean, isActive: boolean) => {
    const info = deviceInfo.toLowerCase();
    const iconColor = !isActive 
      ? "text-muted-foreground/45" 
      : isCurrent 
        ? "text-primary" 
        : info.includes("mobi") || info.includes("android") || info.includes("iphone") 
          ? "text-violet-400" 
          : "text-zinc-400 dark:text-zinc-500";

    if (info.includes("mobi") || info.includes("android") || info.includes("iphone")) {
      return <Smartphone className={cn("w-6 h-6", iconColor)} />;
    }
    return <Monitor className={cn("w-6 h-6", iconColor)} />;
  };

  const formatDeviceName = (deviceInfo: string) => {
    if (deviceInfo.includes("Windows")) return "Windows PC";
    if (deviceInfo.includes("Macintosh")) return "macOS Device";
    if (deviceInfo.includes("iPhone")) return "iPhone";
    if (deviceInfo.includes("Android")) return "Android Phone";
    if (deviceInfo.includes("Linux")) return "Linux PC";
    return deviceInfo;
  };

  const getBrowserName = (deviceInfo: string) => {
    const ua = deviceInfo.toLowerCase();
    if (ua.includes("edg/")) return "Microsoft Edge";
    if (ua.includes("chrome") && !ua.includes("chromium")) return "Google Chrome";
    if (ua.includes("firefox")) return "Mozilla Firefox";
    if (ua.includes("safari") && !ua.includes("chrome")) return "Apple Safari";
    if (ua.includes("opr") || ua.includes("opera")) return "Opera";
    return t("security.browser");
  };

  const activeSessions = sessions.filter((s) => s.isActive);

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("security.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("security.description")}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          <Card className="p-5 flex flex-col gap-3 border border-primary/10 bg-primary/[0.01] backdrop-blur-md rounded-3xl transition-all duration-300 hover:border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <ShieldKeyhole className="w-5 h-5 shrink-0" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">{t("security.recommendationTitle")}</h4>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("security.recommendationDesc")}
            </p>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/10 pb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("security.devicesTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("security.devicesDesc")}
                </p>
              </div>
              {activeSessions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeAll}
                  disabled={isRevokingAll}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer text-xs"
                >
                  {t("security.logoutAll")}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className={cn(
                    "p-5 border bg-card/10 backdrop-blur-md rounded-3xl flex flex-row items-center justify-between gap-6 transition-all duration-300",
                    session.isCurrent 
                      ? "border-primary/45 shadow-[0_0_20px_rgba(187,244,81,0.08)] bg-primary/[0.02]" 
                      : !session.isActive
                        ? "border-border/5 bg-card/5 opacity-60"
                        : "border-border/15 hover:border-border/30 hover:bg-muted/5"
                  )}
                >
                  <div className="flex items-center gap-4 shrink-0">
                    <div className={cn(
                      "p-3.5 rounded-2xl flex items-center justify-center transition-all",
                      session.isCurrent 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(187,244,81,0.15)]" 
                        : !session.isActive
                          ? "bg-muted/10 text-muted-foreground/45 border border-border/5"
                          : "bg-muted/20 text-muted-foreground border border-border/10"
                    )}>
                      {getDeviceIcon(session.deviceInfo, session.isCurrent, session.isActive)}
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-left">
                      <span className="text-sm font-bold text-foreground tracking-tight">
                        {formatDeviceName(session.deviceInfo)}
                      </span>
                      {session.isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] bg-primary/10 text-primary border border-primary/25 px-2.5 py-0.5 rounded-full font-bold w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          {t("security.thisDevice")}
                        </span>
                      ) : session.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-bold w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t("security.active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] bg-muted/10 text-muted-foreground border border-border/10 px-2.5 py-0.5 rounded-full font-bold w-fit">
                          {t("security.loggedOut")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 ml-auto text-right">
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{getBrowserName(session.deviceInfo)}</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span>{t("security.ipAddress").replace("{{ip}}", session.ipAddress || t("security.unknownIp"))}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span>
                          {session.isCurrent || session.isActive 
                            ? t("security.active") 
                            : t("security.loggedOutAt").replace("{{time}}", new Date(session.lastActiveAt).toLocaleString(
                                language === "vi" ? "vi-VN" : language === "zh" ? "zh-CN" : "en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                }
                              ))
                          }
                        </span>
                      </div>
                    </div>

                    {session.isActive && !session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-2xl cursor-pointer w-10 h-10 shrink-0 transition-all duration-300"
                        title={t("security.logoutAll")}
                      >
                        {revokingId === session.id ? (
                          <Spinner className="w-4 h-4 text-red-500 animate-spin" />
                        ) : (
                          <TrashBinMinimalistic className="w-5 h-5" />
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
