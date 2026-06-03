"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import langTranslations from "@/app/i18n";
import type { Language, LanguageContextType } from "@/app/types";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Language | null;
    if (savedLang && (savedLang === "vi" || savedLang === "en" || savedLang === "zh")) {
      setLanguageState(savedLang);
    }
    setMounted(true);
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem("lang", newLang);
    } catch (e) {
      console.error("Failed to save language to localStorage:", e);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = language;
  }, [language, mounted]);

  const t = (key: string): string => {
    const keys = key.split(".");
    
    let current: any = (langTranslations as any)[language];
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        let fallback: any = (langTranslations as any)["vi"];
        for (const fk of keys) {
          if (fallback && typeof fallback === "object" && fk in fallback) {
            fallback = fallback[fk];
          } else {
            fallback = null;
            break;
          }
        }
        if (fallback && typeof fallback === "string") {
          return fallback;
        }
        return key;
      }
    }

    return typeof current === "string" ? current : key;
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
