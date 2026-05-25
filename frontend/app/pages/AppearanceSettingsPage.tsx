"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Sun, Moon, Monitor, CheckCircle } from "@solar-icons/react";

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [lang, setLang] = useState<"vi" | "en">("vi");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const savedLang = localStorage.getItem("lang") as "vi" | "en" | null;
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
    } else {
      // System
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
    toast.success(`Đã đổi giao diện sang: ${newTheme === "dark" ? "Tối" : newTheme === "light" ? "Sáng" : "Hệ thống"}`);
  };

  const applyLanguage = (newLang: "vi" | "en") => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    toast.success(`Đã đổi ngôn ngữ sang: ${newLang === "vi" ? "Tiếng Việt" : "English"}`);
  };

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">Giao diện & Ngôn ngữ</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tùy chỉnh phong cách hiển thị và ngôn ngữ hiển thị trên toàn hệ thống.
        </p>
      </div>

      {/* Theme Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Chủ đề hiển thị</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Dark Theme Card */}
          <Card
            onClick={() => applyTheme("dark")}
            className={`p-5 border bg-card/20 backdrop-blur-md rounded-3xl cursor-pointer flex flex-col items-center gap-3 transition-all relative ${
              theme === "dark" ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border/20 hover:bg-muted/10"
            }`}
          >
            <div className="p-3 rounded-2xl bg-zinc-800 text-yellow-400">
              <Moon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Giao diện Tối</span>
            {theme === "dark" && (
              <CheckCircle className="w-5 h-5 text-primary absolute top-3 right-3" />
            )}
          </Card>

          {/* Light Theme Card */}
          <Card
            onClick={() => applyTheme("light")}
            className={`p-5 border bg-card/20 backdrop-blur-md rounded-3xl cursor-pointer flex flex-col items-center gap-3 transition-all relative ${
              theme === "light" ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border/20 hover:bg-muted/10"
            }`}
          >
            <div className="p-3 rounded-2xl bg-orange-100 text-orange-500">
              <Sun className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Giao diện Sáng</span>
            {theme === "light" && (
              <CheckCircle className="w-5 h-5 text-primary absolute top-3 right-3" />
            )}
          </Card>

          {/* System Theme Card */}
          <Card
            onClick={() => applyTheme("system")}
            className={`p-5 border bg-card/20 backdrop-blur-md rounded-3xl cursor-pointer flex flex-col items-center gap-3 transition-all relative ${
              theme === "system" ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border/20 hover:bg-muted/10"
            }`}
          >
            <div className="p-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-foreground">
              <Monitor className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Hệ thống</span>
            {theme === "system" && (
              <CheckCircle className="w-5 h-5 text-primary absolute top-3 right-3" />
            )}
          </Card>
        </div>
      </div>

      {/* Language Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Ngôn ngữ hiển thị</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vietnamese */}
          <Card
            onClick={() => applyLanguage("vi")}
            className={`p-5 border bg-card/20 backdrop-blur-md rounded-3xl cursor-pointer flex items-center justify-between transition-all relative ${
              lang === "vi" ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border/20 hover:bg-muted/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇻🇳</span>
              <div className="text-left">
                <p className="text-sm font-semibold">Tiếng Việt</p>
                <p className="text-xs text-muted-foreground">Ngôn ngữ mặc định hệ thống</p>
              </div>
            </div>
            {lang === "vi" && (
              <CheckCircle className="w-5 h-5 text-primary" />
            )}
          </Card>

          {/* English */}
          <Card
            onClick={() => applyLanguage("en")}
            className={`p-5 border bg-card/20 backdrop-blur-md rounded-3xl cursor-pointer flex items-center justify-between transition-all relative ${
              lang === "en" ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border/20 hover:bg-muted/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇺🇸</span>
              <div className="text-left">
                <p className="text-sm font-semibold">English</p>
                <p className="text-xs text-muted-foreground">System translation</p>
              </div>
            </div>
            {lang === "en" && (
              <CheckCircle className="w-5 h-5 text-primary" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
