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

export default function FogetPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"email" | "pin" | "newPassword">("email");

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (!email) {
      toast.error("Vui lòng nhập email đăng ký");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.sendResetPin(email);

      if (data.success) {
        toast.success("Mã khôi phục đã được gửi đến email của bạn");
        setPhase("pin");
        setCountdown(30);
      } else {
        toast.error(data.message || "Không thể gửi mã PIN");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Lỗi kết nối. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.verifyResetPin(email, pin);

      if (data.success) {
        toast.success("Xác thực mã PIN thành công. Hãy đặt mật khẩu mới.");
        setPhase("newPassword");
      } else {
        toast.error(data.message || "Mã PIN không đúng");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Xác thực mã PIN thất bại"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự trở lên");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.resetPassword(email, newPassword);

      if (data.success) {
        toast.success("Đổi mật khẩu thành công! Hãy đăng nhập lại.");
        router.push("/login");
      } else {
        toast.error(data.message || "Đổi mật khẩu thất bại");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Đặt lại mật khẩu thất bại"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendPin = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setPin("");
    try {
      const data = await authService.sendResetPin(email);
      if (data.success) {
        toast.success("Đã gửi lại mã PIN mới đến email");
        setCountdown(30);
      } else {
        toast.error(data.message || "Không thể gửi lại mã PIN");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Lỗi gửi lại mã PIN"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen relative bg-zinc-950 text-white flex items-center justify-center">
      {/* corner icons */}
      <button
        onClick={() => router.push("/")}
        className="absolute left-6 top-6 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        aria-label="home"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* Background Ambient Glow (Mesh Gradient Effect for Dark Theme) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--chart-1)]/15 blur-[130px]" />
        <div className="absolute -top-60 left-[20%] w-[900px] h-[900px] rounded-full bg-[oklch(0.48_0.18_290)]/20 blur-[160px]" />
        <div className="absolute top-[20%] -right-40 w-[550px] h-[550px] rounded-full bg-[oklch(0.55_0.2_315)]/15 blur-[120px]" />
        <div className="absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-[var(--chart-3)]/10 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-8 py-10 rounded-2xl bg-[var(--sidebar)]/65 backdrop-blur-xl border border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden">
        <h1 className="text-3xl font-extrabold text-center">Quên mật khẩu</h1>

        <AnimatePresence mode="wait">
          {phase === "email" && (
            <motion.div
              key="email-phase"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <p className="text-sm text-zinc-400 text-center mt-2">
                Nhập email của bạn để nhận mã khôi phục mật khẩu
              </p>
              <form onSubmit={handleSendPin} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400">Email đăng ký</label>
                <Input
                  type="email"
                  placeholder="Nhập email đăng ký..."
                  aria-label="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                      Đang gửi mã...
                    </>
                  ) : (
                    "Gửi mã khôi phục"
                  )}
                </Button>
              </form>

              <p className="text-sm text-zinc-400 text-center mt-6">
                Quay lại{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-white font-bold cursor-pointer hover:underline"
                  disabled={isLoading}
                >
                  Đăng nhập
                </button>
              </p>
            </motion.div>
          )}

          {phase === "pin" && (
            <motion.div
              key="pin-phase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <p className="text-sm text-zinc-400 text-center mt-2">
                Chúng tôi đã gửi mã PIN 6 số đến email: <br />
                <strong className="text-white">{email}</strong>
              </p>
              <form onSubmit={handleVerifyPin} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400 text-center">Nhập mã PIN xác nhận</label>
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
                      Đang xác thực...
                    </>
                  ) : (
                    "Xác nhận mã PIN"
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-6">
                <p className="text-sm text-zinc-400">Bạn không nhận được mã?</p>
                <button
                  type="button"
                  onClick={handleResendPin}
                  className={`text-sm font-bold hover:underline cursor-pointer ${
                    countdown > 0 ? "text-zinc-500 cursor-not-allowed" : "text-amber-400"
                  }`}
                  disabled={isLoading || countdown > 0}
                >
                  {countdown > 0 ? `Gửi lại sau (${countdown}s)` : "Gửi lại mã PIN"}
                </button>
              </div>

              <div className="mt-6 flex justify-center border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setPhase("email")}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
              </div>
            </motion.div>
          )}

          {phase === "newPassword" && (
            <motion.div
              key="newPassword-phase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <p className="text-sm text-zinc-400 text-center mt-2">
                Thiết lập mật khẩu mới cho tài khoản của bạn
              </p>
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4 mt-6">
                <label className="text-xs text-zinc-400">Mật khẩu mới</label>
                <Input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">Xác nhận mật khẩu mới</label>
                <Input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
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
                      Đang lưu mật khẩu...
                    </>
                  ) : (
                    "Đặt lại mật khẩu"
                  )}
                </Button>
              </form>

              <div className="mt-6 flex justify-center border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setPhase("pin")}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
