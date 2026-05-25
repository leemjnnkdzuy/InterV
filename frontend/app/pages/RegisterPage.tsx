"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/app/lib/Client";
import { Spinner } from "@/app/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
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
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      toast.error("Username chỉ được chứa chữ cái, số và dấu gạch dưới (_)");
      return;
    }

    if (username.length < 3 || username.length > 30) {
      toast.error("Username phải từ 3 đến 30 ký tự");
      return;
    }

    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp");
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
        toast.success(response.data.message || "Mã PIN xác thực đã được gửi đến email");
        setPhase("pin");
        setCountdown(30);
      } else {
        toast.error(response.data.message || "Đăng ký không thành công");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi kết nối. Vui lòng thử lại.");
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
      const response = await api.post("/auth/register", {
        action: "verify-pin",
        email,
        pin,
      });

      if (response.data.success) {
        toast.success("Đăng ký thành công! Hãy đăng nhập.");
        router.push("/login");
      } else {
        toast.error(response.data.message || "Mã PIN không đúng");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xác thực thất bại");
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
        toast.success("Đã gửi lại mã PIN mới đến email của bạn");
        setCountdown(30);
      } else {
        toast.error(response.data.message || "Gửi lại mã PIN thất bại");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi gửi lại mã PIN");
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
              <h1 className="text-3xl font-extrabold text-center">Tạo tài khoản</h1>
              <p className="text-sm text-zinc-400 text-center mt-2">Bắt đầu với InterV</p>
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

                <label className="text-xs text-zinc-400">Mật khẩu</label>
                <Input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <label className="text-xs text-zinc-400">Nhập lại mật khẩu</label>
                <Input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
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
                      Đang gửi mã PIN...
                    </>
                  ) : (
                    "Tạo tài khoản"
                  )}
                </Button>
              </form>

              <p className="text-sm text-zinc-400 text-center mt-6">
                Đã có tài khoản?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-white font-bold cursor-pointer hover:underline"
                >
                  Đăng nhập
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
              <h1 className="text-3xl font-extrabold text-center">Xác thực OTP</h1>
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
                    "Xác nhận kích hoạt"
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-6">
                <p className="text-sm text-zinc-400">Bạn không nhận được mã PIN?</p>
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
                  onClick={() => setPhase("input")}
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
