"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import langTranslations from "@/app/i18n";
import type { Language, LanguageContextType } from "@/app/types";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
type TranslationNode = string | { [key: string]: TranslationNode };
type TranslationMap = Record<Language, TranslationNode>;

const translations = langTranslations as TranslationMap;

function isLanguage(value: string | null): value is Language {
  return value === "vi" || value === "en" || value === "zh";
}

function getTranslationValue(source: TranslationNode | undefined, keys: string[]): string | undefined {
  let current = source;

  for (const key of keys) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }

    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedLang = localStorage.getItem("lang");
      if (isLanguage(savedLang)) {
        setLanguageState(savedLang);
      }
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
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

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    const current = getTranslationValue(translations[language], keys);
    const value = current ?? getTranslationValue(translations.vi, keys) ?? key;

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce(
      (text, [param, replacement]) =>
        text.replaceAll(`{{${param}}}`, String(replacement)),
      value
    );
  }, [language]);

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
