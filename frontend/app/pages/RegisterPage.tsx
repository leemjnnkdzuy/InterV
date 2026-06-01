"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Home, ArrowLeft } from "@solar-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import api from "@/app/lib/Client";
import { Spinner } from "@/app/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/app/contexts/AuthContext";
import type { ApiErrorResponse } from "@/app/types";

const getRegisterErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();

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
      toast.error("Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      toast.error("Username chá»‰ Ä‘Æ°á»£c chá»©a chá»¯ cÃ¡i, sá»‘ vÃ  dáº¥u gáº¡ch dÆ°á»›i (_)");
      return;
    }

    if (username.length < 3 || username.length > 30) {
      toast.error("Username pháº£i tá»« 3 Ä‘áº¿n 30 kÃ½ tá»±");
      return;
    }

    if (password.length < 6) {
      toast.error("Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Máº­t kháº©u nháº­p láº¡i khÃ´ng khá»›p");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", {
        action: "send-pin",
        email,
        username,
        password,
      });

      if (response.data.success) {
        toast.success(response.data.message || "MÃ£ PIN xÃ¡c thá»±c Ä‘Ã£ Ä‘Æ°á»£c gá»­i Ä‘áº¿n email");
        setPhase("pin");
        setCountdown(30);
      } else {
        toast.error(response.data.message || "ÄÄƒng kÃ½ khÃ´ng thÃ nh cÃ´ng");
      }
    } catch (err) {
      toast.error(getRegisterErrorMessage(err, "Lá»—i káº¿t ná»‘i. Vui lÃ²ng thá»­ láº¡i."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      toast.error("Vui lÃ²ng nháº­p Ä‘á»§ 6 chá»¯ sá»‘");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", {
        action: "verify-pin",
        email,
        pin,
      });

      if (response.data.success) {
        toast.success("ÄÄƒng kÃ½ thÃ nh cÃ´ng! HÃ£y Ä‘Äƒng nháº­p.");
        router.push("/login");
      } else {
        toast.error(response.data.message || "MÃ£ PIN khÃ´ng Ä‘Ãºng");
      }
    } catch (err) {
      toast.error(getRegisterErrorMessage(err, "XÃ¡c thá»±c tháº¥t báº¡i"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendPin = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setPin("");
    try {
      const response = await api.post("/auth/register", {
        action: "send-pin",
        email,
        username,
        password,
      });
      if (response.data.success) {
        toast.success("ÄÃ£ gá»­i láº¡i mÃ£ PIN má»›i Ä‘áº¿n email cá»§a báº¡n");
        setCountdown(30);
      } else {
        toast.error(response.data.message || "Gá»­i láº¡i mÃ£ PIN tháº¥t báº¡i");
      }
    } catch (err) {
      toast.error(getRegisterErrorMessage(err, "Lá»—i gá»­i láº¡i mÃ£ PIN"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen relative bg-zinc-950 text-white flex items-center justify-center">
      <button
        onClick={() => router.push("/")}
        className="absolute left-6 top-6 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        aria-label="home"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* Background Ambient Glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--chart-1)]/15 blur-[130px]" />
        <div className="absolute -top-60 left-[20%] w-[900px] h-[900px] rounded-full bg-[oklch(0.48_0.18_290)]/20 blur-[160px]" />
        <div className="absolute top-[20%] -right-40 w-[550px] h-[550px] rounded-full bg-[oklch(0.55_0.2_315)]/15 blur-[120px]" />
        <div className="absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-[var(--chart-3)]/10 blur-[150px]" />
      </div>

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
              <h1 className="text-3xl font-extrabold text-center">Táº¡o tÃ i khoáº£n</h1>
              <p className="text-sm text-zinc-400 text-center mt-2">Báº¯t Ä‘áº§u vá»›i InterV</p>
              <form onSubmit={handleSendPin} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400">Username</label>
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">Email</label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">Máº­t kháº©u</label>
                <Input
                  type="password"
                  placeholder="Máº­t kháº©u"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">Nháº­p láº¡i máº­t kháº©u</label>
                <Input
                  type="password"
                  placeholder="Nháº­p láº¡i máº­t kháº©u"
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
                      Äang gá»­i mÃ£ PIN...
                    </>
                  ) : (
                    "Táº¡o tÃ i khoáº£n"
                  )}
                </Button>
              </form>

              <p className="text-sm text-zinc-400 text-center mt-6">
                ÄÃ£ cÃ³ tÃ i khoáº£n?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-white font-bold cursor-pointer hover:underline"
                >
                  ÄÄƒng nháº­p
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
              <h1 className="text-3xl font-extrabold text-center">XÃ¡c thá»±c OTP</h1>
              <p className="text-sm text-zinc-400 text-center mt-2">
                ChÃºng tÃ´i Ä‘Ã£ gá»­i mÃ£ PIN 6 sá»‘ Ä‘áº¿n email: <br />
                <strong className="text-white">{email}</strong>
              </p>
              <form onSubmit={handleVerifyPin} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400 text-center">Nháº­p mÃ£ PIN xÃ¡c nháº­n</label>
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
                      Äang xÃ¡c thá»±c...
                    </>
                  ) : (
                    "XÃ¡c nháº­n kÃ­ch hoáº¡t"
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-6">
                <p className="text-sm text-zinc-400">Báº¡n khÃ´ng nháº­n Ä‘Æ°á»£c mÃ£ PIN?</p>
                <button
                  type="button"
                  onClick={handleResendPin}
                  className={`text-sm font-bold hover:underline cursor-pointer ${
                    countdown > 0 ? "text-zinc-500 cursor-not-allowed" : "text-amber-400"
                  }`}
                  disabled={isLoading || countdown > 0}
                >
                  {countdown > 0 ? `Gá»­i láº¡i sau (${countdown}s)` : "Gá»­i láº¡i mÃ£ PIN"}
                </button>
              </div>

              <div className="mt-6 flex justify-center border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay láº¡i
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
