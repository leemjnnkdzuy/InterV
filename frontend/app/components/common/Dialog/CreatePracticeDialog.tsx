"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";
import { INDUSTRIES } from "@/app/contants";
import { practiceService } from "@/app/services";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateIndustry } from "@/app/lib/Localization";
import type { CreatePracticeDialogProps, PracticeMutationResponse } from "@/app/types";

export default function CreatePracticeDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreatePracticeDialogProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("Công nghệ thông tin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!isOpen) return;

      setTitle("");
      setIndustry("Công nghệ thông tin");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("createPractice.titleRequired"));
      return;
    }

    try {
      setIsSubmitting(true);
      const data = (await practiceService.create({
        title,
        industry,
      })) as PracticeMutationResponse;

      if (data.success) {
        onSuccess(data.session);
        onOpenChange(false);
      } else {
        toast.error(data.message || t("createPractice.failed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("createPractice.serverError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {t("createPractice.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {t("createPractice.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-left">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("createPractice.titleLabel")} <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder={t("createPractice.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-2xl text-left"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("createPractice.industryLabel")}
            </label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="rounded-2xl w-full border border-input bg-background px-3 py-2 text-sm">
                <SelectValue placeholder={t("createPractice.industryPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border/10 rounded-2xl shadow-lg">
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind} className="cursor-pointer rounded-xl">
                    {translateIndustry(t, ind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-2xl cursor-pointer"
            >
              {t("createPractice.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? t("createPractice.submitting") : t("createPractice.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
