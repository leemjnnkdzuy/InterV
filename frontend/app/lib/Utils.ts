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

export function constrainCropPosition(
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
  currentScale: number,
  currentPos: { x: number; y: number }
) {
  const minDim = Math.min(naturalWidth, naturalHeight);
  const displayScale = cropSize / minDim;
  const displayW = naturalWidth * displayScale * currentScale;
  const displayH = naturalHeight * displayScale * currentScale;

  const maxX = Math.max(0, (displayW - cropSize) / 2);
  const minX = -maxX;
  const maxY = Math.max(0, (displayH - cropSize) / 2);
  const minY = -maxY;

  return {
    x: Math.max(minX, Math.min(maxX, currentPos.x)),
    y: Math.max(minY, Math.min(maxY, currentPos.y)),
  };
}

export interface CropCoords {
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
}

export function calculateCropCoords(
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
  scale: number,
  position: { x: number; y: number }
): CropCoords {
  const minDim = Math.min(naturalWidth, naturalHeight);
  const displayScale = cropSize / minDim;
  const displayW = naturalWidth * displayScale * scale;
  const displayH = naturalHeight * displayScale * scale;

  const cropCenterX = cropSize / 2;
  const cropCenterY = cropSize / 2;

  const imgDisplayX = cropCenterX - displayW / 2 + position.x;
  const imgDisplayY = cropCenterY - displayH / 2 + position.y;

  const srcX = ((0 - imgDisplayX) / displayW) * naturalWidth;
  const srcY = ((0 - imgDisplayY) / displayH) * naturalHeight;
  const srcW = (cropSize / displayW) * naturalWidth;
  const srcH = (cropSize / displayH) * naturalHeight;

  return { srcX, srcY, srcW, srcH };
}

export function calculatePreviewCoords(
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
  scale: number,
  position: { x: number; y: number }
) {
  const minDim = Math.min(naturalWidth, naturalHeight);
  const displayScale = cropSize / minDim;
  const displayW = naturalWidth * displayScale * scale;
  const displayH = naturalHeight * displayScale * scale;

  const drawX = (cropSize - displayW) / 2 + position.x;
  const drawY = (cropSize - displayH) / 2 + position.y;

  return { drawX, drawY, displayW, displayH };
}
