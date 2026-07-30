"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Eye, EyeClosed, Home } from "@solar-icons/react";
import { Spinner } from "@/app/components/ui/spinner";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Checkbox } from "@/app/components/ui/checkbox";
import { toast } from "sonner";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { useLanguage } from "@/app/hooks/useLanguage";
import SilkBackground from "@/app/components/common/SilkBackground";
import { roleHomePath } from "@/app/lib/RoleRouting";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAuthenticated, loading } = useAuthContext();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(roleHomePath(user?.role));
    }
  }, [isAuthenticated, loading, router, user?.role]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !password) {
      toast.error(t("auth.loginRequiredFields"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier, password, remember);
      if (res.success) {
        const role = res.user?.role || "user";
        const requestedPath = searchParams.get("next");
        const isSafeInternalPath =
          requestedPath?.startsWith("/") &&
          !requestedPath.startsWith("//") &&
          ((role === "admin" && requestedPath.startsWith("/admin")) ||
            (role === "recruiter" &&
              requestedPath.startsWith("/recruiter")) ||
            (role === "user" &&
              !requestedPath.startsWith("/admin") &&
              !requestedPath.startsWith("/recruiter")));
        router.replace(
          isSafeInternalPath && requestedPath
            ? requestedPath
            : roleHomePath(role)
        );
      } else {
        toast.error(res.message || t("auth.invalidLogin"));
      }
    } catch {
      toast.error(t("auth.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen relative bg-zinc-950 text-white flex items-center justify-center">
      {/* corner icons */}
      <button
        onClick={() => router.push("/")}
        className="absolute left-6 top-6 z-20 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        aria-label="home"
      >
        <Home className="w-5 h-5" />
      </button>

      <SilkBackground />

      <div className="relative z-10 w-full max-w-md px-8 py-10 rounded-2xl bg-[var(--sidebar)]/65 backdrop-blur-xl border border-zinc-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <h1 className="text-3xl font-extrabold text-center">{t("auth.loginTitle")}</h1>
        <p className="text-sm text-zinc-400 text-center mt-2">{t("auth.loginSubtitle")}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          <label className="text-xs text-zinc-400">{t("auth.identifierLabel")}</label>
          <Input
            placeholder={t("auth.identifierPlaceholder")}
            aria-label="email-or-username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={isLoading}
          />

          <label className="text-xs text-zinc-400">{t("auth.passwordLabel")}</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.passwordPlaceholder")}
              aria-label="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeClosed className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm text-zinc-400 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(!!v)}
                className="w-4 h-4"
                disabled={isLoading}
              />
              <span>{t("auth.remember")}</span>
            </label>
            <button
              type="button"
              onClick={() => router.push("/forget-password")}
              className="text-amber-400 cursor-pointer hover:underline"
              disabled={isLoading}
            >
              {t("auth.forgotPassword")}
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
                {t("auth.loggingIn")}
              </>
            ) : (
              t("auth.loginButton")
            )}
          </Button>
        </form>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-white/10" />
            <span>{t("auth.or")}</span>
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
          {t("auth.noAccount")}{" "}
          <button
            onClick={() => router.push("/register")}
            className="text-white font-bold cursor-pointer hover:underline"
            disabled={isLoading}
          >
            {t("auth.registerLink")}
          </button>
        </p>
      </div>
    </div>
  );
}
