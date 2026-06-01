"use client";

import { Card } from "@/app/components/ui/card";
import { Sun, Moon, Monitor, CheckCircle, AltArrowDown } from "@solar-icons/react";
import { useTheme } from "@/app/hooks/useTheme";
import { useLanguage, Language } from "@/app/hooks/useLanguage";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/app/components/ui/dropdown-menu";
import { VN, US, CN } from "country-flag-icons/react/3x2";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
  };

  const applyLanguage = (newLang: Language) => {
    setLanguage(newLang);
  };

  const getLanguageDetails = (lang: Language) => {
    switch (lang) {
      case "vi":
        return {
          flag: <VN className="w-5 h-3.5 object-cover rounded-[2px] inline-block shrink-0 shadow-sm" />,
          label: t("appearance.langVi"),
        };
      case "en":
        return {
          flag: <US className="w-5 h-3.5 object-cover rounded-[2px] inline-block shrink-0 shadow-sm" />,
          label: t("appearance.langEn"),
        };
      case "zh":
        return {
          flag: <CN className="w-5 h-3.5 object-cover rounded-[2px] inline-block shrink-0 shadow-sm" />,
          label: t("appearance.langZh"),
        };
    }
  };

  const currentLangDetails = getLanguageDetails(language);

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("appearance.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("appearance.description")}
        </p>
      </div>

      {/* Theme Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">{t("appearance.themeSection")}</h3>
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
            <span className="text-sm font-medium">{t("appearance.themeDark")}</span>
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
            <span className="text-sm font-medium">{t("appearance.themeLight")}</span>
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
            <span className="text-sm font-medium">{t("appearance.themeSystem")}</span>
            {theme === "system" && (
              <CheckCircle className="w-5 h-5 text-primary absolute top-3 right-3" />
            )}
          </Card>
        </div>
      </div>

      {/* Language Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("appearance.langSection")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("appearance.langSelectPlaceholder")}</p>
        </div>
        <div className="w-full sm:w-auto min-w-[220px]">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full rounded-2xl border border-border/10 bg-muted/40 px-3 py-2 text-sm flex items-center justify-between cursor-pointer outline-none hover:bg-muted/60 transition-colors">
              <span className="flex items-center gap-2">
                {currentLangDetails.flag}
                <span>{currentLangDetails.label}</span>
              </span>
              <AltArrowDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border border-border/10 p-1.5 rounded-3xl shadow-lg w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem onClick={() => applyLanguage("vi")} className="cursor-pointer">
                <span className="flex items-center gap-2 w-full">
                  <VN className="w-5 h-3.5 object-cover rounded-[2px] inline-block shrink-0 shadow-sm" />
                  <span>{t("appearance.langVi")}</span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyLanguage("en")} className="cursor-pointer">
                <span className="flex items-center gap-2 w-full">
                  <US className="w-5 h-3.5 object-cover rounded-[2px] inline-block shrink-0 shadow-sm" />
                  <span>{t("appearance.langEn")}</span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyLanguage("zh")} className="cursor-pointer">
                <span className="flex items-center gap-2 w-full">
                  <CN className="w-5 h-3.5 object-cover rounded-[2px] inline-block shrink-0 shadow-sm" />
                  <span>{t("appearance.langZh")}</span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
