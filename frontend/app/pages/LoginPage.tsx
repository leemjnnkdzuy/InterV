"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Home } from "lucide-react";
import { Spinner } from "@/app/components/ui/spinner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/app/components/ui/checkbox";
import { toast } from "sonner";
import { useAuthContext } from "@/app/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthContext();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !password) {
      toast.error("Vui lòng điền đầy đủ thông tin đăng nhập");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier, password, remember);
      if (res.success) {
        toast.success("Đăng nhập thành công!");
        router.push("/");
      } else {
        toast.error(res.message || "Tên đăng nhập/Email hoặc mật khẩu không chính xác");
      }
    } catch (error: any) {
      toast.error("Đã xảy ra lỗi khi kết nối với máy chủ");
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
        {/* Soft Gold/Orange/Lime glow in top-left using chart-1 */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--chart-1)]/15 blur-[130px]" />

        {/* Soft Violet/Purple glow in the center-top */}
        <div className="absolute -top-60 left-[20%] w-[900px] h-[900px] rounded-full bg-[oklch(0.48_0.18_290)]/20 blur-[160px]" />

        {/* Soft Pink/Magenta ambient glow on the right-middle side */}
        <div className="absolute top-[20%] -right-40 w-[550px] h-[550px] rounded-full bg-[oklch(0.55_0.2_315)]/15 blur-[120px]" />

        {/* Soft Green base ambient glow towards bottom-left using chart-3 */}
        <div className="absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-[var(--chart-3)]/10 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-8 py-10 rounded-2xl bg-[var(--sidebar)]/65 backdrop-blur-xl border border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <h1 className="text-3xl font-extrabold text-center">Đăng nhập</h1>
        <p className="text-sm text-zinc-400 text-center mt-2">Chào mừng bạn quay trở lại</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          <label className="text-xs text-zinc-400">Email hoặc Username</label>
          <Input
            placeholder="Nhập email hoặc username..."
            aria-label="email-or-username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={isLoading}
          />

          <label className="text-xs text-zinc-400">Mật khẩu</label>
          <Input
            type="password"
            placeholder="Nhập mật khẩu..."
            aria-label="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <div className="flex items-center justify-between text-sm text-zinc-400 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(!!v)}
                className="w-4 h-4"
                disabled={isLoading}
              />
              <span>Lưu đăng nhập</span>
            </label>
            <button
              type="button"
              onClick={() => router.push("/forget-password")}
              className="text-amber-400 cursor-pointer hover:underline"
              disabled={isLoading}
            >
              Quên mật khẩu?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full rounded-full bg-[var(--chart-1)] hover:bg-[var(--chart-2)] text-zinc-950 font-bold mt-4 py-2 flex items-center justify-center gap-2 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-white/10" />
            <span>hoặc</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
            disabled={isLoading}
          >
            <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.7 1.22 9.19 3.6l6.87-6.87C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.02 6.23C12.5 13.09 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.64-.14-3.22-.41-4.74H24v9.02h12.74c-.55 2.99-2.22 5.52-4.74 7.22l7.62 5.93C43.99 37.32 46.5 31.42 46.5 24.5z"
              />
              <path
                fill="#FBBC05"
                d="M10.58 28.45c-.48-1.44-.76-2.98-.76-4.45 0-1.47.27-3.01.76-4.45l-8.02-6.23C.92 16.41 0 20.11 0 24c0 3.89.92 7.59 2.56 10.68l8.02-6.23z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.9-2.13 15.86-5.81l-7.62-5.93c-2.09 1.4-4.76 2.23-8.24 2.23-6.26 0-11.5-3.59-13.42-8.95l-8.02 6.23C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Google
          </Button>
        </div>

        <p className="text-sm text-zinc-400 text-center mt-6">
          Chưa có tài khoản?{" "}
          <button
            onClick={() => router.push("/register")}
            className="text-white font-bold cursor-pointer hover:underline"
            disabled={isLoading}
          >
            Đăng ký
          </button>
        </p>
      </div>
    </div>
  );
}
