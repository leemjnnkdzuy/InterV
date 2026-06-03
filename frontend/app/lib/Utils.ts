import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios"
import type { ApiErrorResponse, DifficultyLevel, AiPersonality } from "@/app/types"
import {
  DIFFICULTY_LEVELS_BY_INDUSTRY,
  DEFAULT_DIFFICULTY_LEVELS,
  AI_PERSONALITIES_BY_INDUSTRY,
  DEFAULT_AI_PERSONALITIES,
} from "@/app/contants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }
  
  return fallback;
}

export function getDifficultyLevels(industry: string): DifficultyLevel[] {
  return DIFFICULTY_LEVELS_BY_INDUSTRY[industry] || DEFAULT_DIFFICULTY_LEVELS;
}

export function getAiPersonalities(industry: string): AiPersonality[] {
  return AI_PERSONALITIES_BY_INDUSTRY[industry] || DEFAULT_AI_PERSONALITIES;
}

export function getAiPersonality(id: string, industry: string): AiPersonality {
  const list = getAiPersonalities(industry);
  return list.find((a) => a.id === id) || list[0] || DEFAULT_AI_PERSONALITIES[0];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function getActionName(action: string): string {
  switch (action) {
    case "REGISTER_BONUS":
      return "Quà tặng đăng ký";
    case "RECHARGE":
      return "Nạp Credits";
    case "AI_INTERVIEW":
      return "Phỏng vấn AI";
    case "ADMIN_ADJUST":
      return "Điều chỉnh bởi Admin";
    default:
      return action;
  }
}

