"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Home, ArrowLeft } from "@solar-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/app/services";
import { Spinner } from "@/app/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { getErrorMessage } from "@/app/lib/Utils";
import { useLanguage } from "@/app/hooks/useLanguage";
import SilkBackground from "@/app/components/common/SilkBackground";
import { PASSWORD_MIN_LENGTH } from "@/app/contants";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"input" | "pin">("input");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pin, setPin] = useState("");
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      toast.error(t("auth.fillAllFields"));
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      toast.error(t("auth.usernameInvalid"));
      return;
    }

    if (username.length < 3 || username.length > 30) {
      toast.error(t("auth.usernameLength"));
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      toast.error(t("auth.passwordMin"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.sendRegisterPin(username, email, password);

      if (data.success) {
        toast.success(data.message || t("auth.registerPinSent"));
        setPhase("pin");
        setCountdown(30);
      } else {
        toast.error(data.message || t("auth.registerFailed"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("auth.connectionRetry")));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      toast.error(t("auth.pinRequired"));
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyRegisterPin(email, pin);

      if (data.success) {
        toast.success(t("auth.registerSuccess"));
        router.push("/login");
      } else {
        toast.error(data.message || t("auth.pinWrong"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("auth.verifyFailed")));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendPin = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setPin("");
    try {
      const data = await authService.sendRegisterPin(username, email, password);
      if (data.success) {
        toast.success(t("auth.resendSuccess"));
        setCountdown(30);
      } else {
        toast.error(data.message || t("auth.resendFailed"));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t("auth.resendError")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-background text-foreground flex items-center justify-center">
      <button
        onClick={() => router.push("/")}
        className="absolute left-6 top-6 z-20 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        aria-label="home"
      >
        <Home className="w-5 h-5" />
      </button>

      <SilkBackground />

      <div className="relative z-10 w-full max-w-md px-8 py-10 rounded-2xl bg-[var(--sidebar)]/65 backdrop-blur-xl border border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "input" ? (
            <motion.div
              key="input-phase"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h1 className="text-3xl font-extrabold text-center">{t("auth.registerTitle")}</h1>
              <p className="text-sm text-zinc-400 text-center mt-2">{t("auth.registerSubtitle")}</p>
              <form onSubmit={handleSendPin} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400">{t("auth.usernameLabel")}</label>
                <Input
                  placeholder={t("auth.usernamePlaceholder")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">{t("auth.emailLabel")}</label>
                <Input
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">{t("auth.passwordLabel")}</label>
                <Input
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">{t("auth.confirmPasswordLabel")}</label>
                <Input
                  type="password"
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  className="w-full rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold mt-4 py-2 flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      {t("auth.sendingPin")}
                    </>
                  ) : (
                    t("auth.createAccount")
                  )}
                </Button>
              </form>

              <p className="text-sm text-zinc-400 text-center mt-6">
                {t("auth.haveAccount")}{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-white font-bold cursor-pointer hover:underline"
                >
                  {t("auth.loginButton")}
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pin-phase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h1 className="text-3xl font-extrabold text-center">{t("auth.pinTitle")}</h1>
              <p className="text-sm text-zinc-400 text-center mt-2">
                {t("auth.pinSentTo")} <br />
                <strong className="text-white">{email}</strong>
              </p>
              <form onSubmit={handleVerifyPin} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400 text-center">{t("auth.pinLabel")}</label>
                <Input
                  type="text"
                  placeholder="------"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  required
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  className="w-full rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold mt-4 py-2 flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      {t("auth.verifying")}
                    </>
                  ) : (
                    t("auth.activateAccount")
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-6">
                <p className="text-sm text-zinc-400">{t("auth.noPin")}</p>
                <button
                  type="button"
                  onClick={handleResendPin}
                  className={`text-sm font-bold hover:underline cursor-pointer ${
                    countdown > 0 ? "text-zinc-500 cursor-not-allowed" : "text-amber-400"
                  }`}
                  disabled={isLoading || countdown > 0}
                >
                  {countdown > 0 ? t("auth.resendCountdown", { seconds: countdown }) : t("auth.resendPin")}
                </button>
              </div>

              <div className="mt-6 flex justify-center border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> {t("auth.back")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
