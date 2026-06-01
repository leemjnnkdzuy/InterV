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
import type { CreatePracticeDialogProps, PracticeMutationResponse } from "@/app/types";

export default function CreatePracticeDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreatePracticeDialogProps) {
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("CÃ´ng nghá»‡ thÃ´ng tin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!isOpen) return;

      setTitle("");
      setIndustry("CÃ´ng nghá»‡ thÃ´ng tin");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Vui lÃ²ng nháº­p tÃªn buá»•i luyá»‡n táº­p");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = (await practiceService.create({
        title,
        industry,
      })) as PracticeMutationResponse;

      if (data.success) {
        toast.success("ÄÃ£ táº¡o buá»•i luyá»‡n táº­p phá»ng váº¥n thÃ nh cÃ´ng!");
        onSuccess(data.session);
        onOpenChange(false);
      } else {
        toast.error(data.message || "Táº¡o buá»•i luyá»‡n táº­p tháº¥t báº¡i");
      }
    } catch (err) {
      console.error(err);
      toast.error("L?i k?t n?i máy ch?");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Táº¡o buá»•i luyá»‡n táº­p phá»ng váº¥n
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Nháº­p tÃªn buá»•i phá»ng váº¥n vÃ  ngÃ nh nghá» Ä‘á»ƒ AI chuáº©n bá»‹ bá»™ khung phá»ng váº¥n tá»‘t nháº¥t.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-left">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              TÃªn buá»•i luyá»‡n táº­p <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="VÃ­ dá»¥: Phá»ng váº¥n vá»‹ trÃ­ Senior React Developer táº¡i Google"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-2xl text-left"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              NgÃ nh nghá» / LÄ©nh vá»±c
            </label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="rounded-2xl w-full border border-input bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Chá»n ngÃ nh nghá»" />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border/10 rounded-2xl shadow-lg">
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind} className="cursor-pointer rounded-xl">
                    {ind}
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
              Há»§y
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Äang chuáº©n bá»‹..." : "Báº¯t Ä‘áº§u khá»Ÿi táº¡o"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
