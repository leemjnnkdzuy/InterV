"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { UploadMinimalistic, MagnifierZoomIn, MagnifierZoomOut, Restart } from "@solar-icons/react";
import { Check } from "lucide-react";

import { Spinner } from "@/app/components/ui/spinner";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { useLanguage } from "@/app/hooks/useLanguage";

const AVATAR_CROP_CONFIG = {
  MAX_OUTPUT_SIZE: 512,
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  QUALITY: 0.85,
  CROP_SIZE: 280,
  ZOOM_MIN: 1.0,
  ZOOM_MAX: 3.0,
  ZOOM_STEP_SMALL: 0.1,
  ZOOM_STEP_BIG: 0.2,
};

interface AvatarCropDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (base64: string) => Promise<void> | void;
}

export default function AvatarCropDialog({
  isOpen,
  onOpenChange,
  onSave,
}: AvatarCropDialogProps) {
  const { t } = useLanguage();
  const {
    MAX_OUTPUT_SIZE,
    MAX_FILE_SIZE,
    QUALITY,
    CROP_SIZE,
    ZOOM_MAX,
    ZOOM_STEP_SMALL,
    ZOOM_STEP_BIG,
  } = AVATAR_CROP_CONFIG;

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setImageSrc(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setError(null);
      setIsSaving(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const constrainPosition = useCallback(
    (currentScale: number, currentPos: { x: number; y: number }) => {
      if (!imageRef.current) return currentPos;
      const img = imageRef.current;
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const displayScale = CROP_SIZE / minDim;
      const displayW = img.naturalWidth * displayScale * currentScale;
      const displayH = img.naturalHeight * displayScale * currentScale;

      const maxX = Math.max(0, (displayW - CROP_SIZE) / 2);
      const minX = -maxX;
      const maxY = Math.max(0, (displayH - CROP_SIZE) / 2);
      const minY = -maxY;

      return {
        x: Math.max(minX, Math.min(maxX, currentPos.x)),
        y: Math.max(minY, Math.min(maxY, currentPos.y)),
      };
    },
    [CROP_SIZE]
  );

  useEffect(() => {
    if (!imageRef.current || !imageSrc) return;
    setPosition((prev) => constrainPosition(scale, prev));
  }, [scale, imageSrc, constrainPosition]);

  const loadImage = useCallback(
    (file: File) => {
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError(t("dialogs.avatarInvalidFile"));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(t("dialogs.avatarFileTooLarge"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          imageRef.current = img;
          setImageSrc(result);
          setScale(1);
          setPosition({ x: 0, y: 0 });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    },
    [MAX_FILE_SIZE, t]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        loadImage(files[0]);
      }
    },
    [loadImage]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        loadImage(files[0]);
      }
      e.target.value = "";
    },
    [loadImage]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!imageSrc) return;
      e.preventDefault();
      setIsDraggingImage(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [imageSrc, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingImage || !imageRef.current) return;
      e.preventDefault();

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      const constrained = constrainPosition(scale, { x: newX, y: newY });
      setPosition(constrained);
    },
    [isDraggingImage, dragStart, scale, constrainPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingImage(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!imageSrc || e.touches.length !== 1) return;
      const touch = e.touches[0];
      setIsDraggingImage(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
    },
    [imageSrc, position]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingImage || e.touches.length !== 1 || !imageRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];

      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;

      const constrained = constrainPosition(scale, { x: newX, y: newY });
      setPosition(constrained);
    },
    [isDraggingImage, dragStart, scale, constrainPosition]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDraggingImage(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP_SMALL : ZOOM_STEP_SMALL;
    setScale((prev) => Math.max(1.0, Math.min(ZOOM_MAX, prev + delta)));
  }, [ZOOM_MAX, ZOOM_STEP_SMALL]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP_BIG));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(1.0, prev - ZOOM_STEP_BIG));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleSave = useCallback(async () => {
    if (!imageRef.current || !imageSrc) return;

    setIsSaving(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = MAX_OUTPUT_SIZE;
      canvas.height = MAX_OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      const img = imageRef.current;

      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const displayScale = CROP_SIZE / minDim;
      const displayW = img.naturalWidth * displayScale * scale;
      const displayH = img.naturalHeight * displayScale * scale;

      const cropCenterX = CROP_SIZE / 2;
      const cropCenterY = CROP_SIZE / 2;

      const imgDisplayX = cropCenterX - displayW / 2 + position.x;
      const imgDisplayY = cropCenterY - displayH / 2 + position.y;

      const srcX = ((0 - imgDisplayX) / displayW) * img.naturalWidth;
      const srcY = ((0 - imgDisplayY) / displayH) * img.naturalHeight;
      const srcW = (CROP_SIZE / displayW) * img.naturalWidth;
      const srcH = (CROP_SIZE / displayH) * img.naturalHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        0,
        0,
        MAX_OUTPUT_SIZE,
        MAX_OUTPUT_SIZE
      );

      const base64 = canvas.toDataURL("image/webp", QUALITY);

      await onSave(base64);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to crop/save avatar:", err);
      setError(t("dialogs.avatarCropError"));
    } finally {
      setIsSaving(false);
    }
  }, [imageSrc, scale, position, onSave, onOpenChange, CROP_SIZE, MAX_OUTPUT_SIZE, QUALITY, t]);

  // Update canvas preview
  useEffect(() => {
    if (!imageSrc || !imageRef.current || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imageRef.current;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const displayScale = CROP_SIZE / minDim;
    const displayW = img.naturalWidth * displayScale * scale;
    const displayH = img.naturalHeight * displayScale * scale;

    const drawX = (CROP_SIZE - displayW) / 2 + position.x;
    const drawY = (CROP_SIZE - displayH) / 2 + position.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, drawX, drawY, displayW, displayH);
    ctx.restore();

    ctx.strokeStyle = "rgba(99, 102, 241, 0.6)"; // violet-500/60 color to match app palette
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      CROP_SIZE / 2,
      CROP_SIZE / 2,
      CROP_SIZE / 2 - 1,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }, [imageSrc, scale, position, CROP_SIZE]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[420px] overflow-hidden" showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.avatarTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.avatarDesc")}</DialogDescription>
        </DialogHeader>

        <div className="relative pt-2 overflow-hidden flex flex-col h-[380px]">
          <div
            className={`flex h-full w-[200%] transition-transform duration-500 ease-in-out ${
              imageSrc ? "-translate-x-1/2" : "translate-x-0"
            }`}
          >
            {/* Phase 1: Upload */}
            <div
              className={`w-1/2 h-full flex flex-col justify-center items-center flex-shrink-0 transition-opacity duration-300 ${
                imageSrc ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <div
                className={`
                  relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-200 cursor-pointer
                  w-full h-full flex flex-col justify-center items-center
                  ${
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border/40 hover:border-border/60 hover:bg-muted/10"
                  }
                `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <UploadMinimalistic
                    className={`w-10 h-10 ${
                      isDragging ? "text-primary animate-bounce" : "text-muted-foreground"
                    } transition-colors`}
                  />
                  <div>
                    <p className="font-semibold text-sm">
                      {isDragging
                        ? t("dialogs.avatarDragActive")
                        : t("dialogs.avatarDragPlaceholder")}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {t("dialogs.avatarUploadLimit")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2: Crop */}
            <div
              className={`w-1/2 h-full flex flex-col items-center gap-4 flex-shrink-0 justify-center transition-opacity duration-300 ${
                imageSrc ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {/* Preview Canvas */}
              <div
                ref={containerRef}
                className="relative select-none overflow-hidden rounded-full bg-black/10 dark:bg-black/35 shadow-inner"
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  touchAction: "none",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                <canvas
                  ref={previewCanvasRef}
                  width={CROP_SIZE}
                  height={CROP_SIZE}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2.5 w-full justify-center px-4">
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-xl bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={t("dialogs.avatarZoomOut")}
                >
                  <MagnifierZoomOut className="w-4 h-4" />
                </button>

                {/* Zoom Slider */}
                <div className="flex-1 max-w-[150px]">
                  <input
                    type="range"
                    min={100}
                    max={ZOOM_MAX * 100}
                    value={scale * 100}
                    onChange={(e) => setScale(parseInt(e.target.value) / 100)}
                    className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3.5
                      [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-primary
                      [&::-webkit-slider-thumb]:cursor-pointer
                    "
                  />
                </div>

                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-xl bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={t("dialogs.avatarZoomIn")}
                >
                  <MagnifierZoomIn className="w-4 h-4" />
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 rounded-xl bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={t("dialogs.avatarReset")}
                >
                  <Restart className="w-4 h-4" />
                </button>
              </div>

              <p className="text-muted-foreground text-[10px] text-center">
                {t("dialogs.avatarCropInstruction")}
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center">
            {error}
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border/10">
          {imageSrc ? (
            <>
              <Button
                onClick={() => {
                  setImageSrc(null);
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                variant="outline"
                disabled={isSaving}
                className="rounded-2xl h-9 text-xs px-4 cursor-pointer"
              >
                {t("dialogs.avatarSelectOther")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-2xl h-9 text-xs px-5 font-medium cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Spinner className="mr-1.5 size-3.5" />
                    {t("dialogs.avatarSaving")}
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    {t("dialogs.avatarSave")}
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="rounded-2xl h-9 text-xs px-4 cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
