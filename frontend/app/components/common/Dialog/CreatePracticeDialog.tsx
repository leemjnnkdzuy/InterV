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
      toast.error("Vui lòng nhập tên buổi luyện tập");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = (await practiceService.create({
        title,
        industry,
      })) as PracticeMutationResponse;

      if (data.success) {
        toast.success("Đã tạo buổi luyện tập phỏng vấn thành công!");
        onSuccess(data.session);
        onOpenChange(false);
      } else {
        toast.error(data.message || "Tạo buổi luyện tập thất bại");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Tạo buổi luyện tập phỏng vấn
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Nhập tên buổi phỏng vấn và ngành nghề để AI chuẩn bị bộ khung phỏng vấn tốt nhất.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-left">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Tên buổi luyện tập <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Phỏng vấn vị trí Senior React Developer tại Google"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-2xl text-left"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Ngành nghề / Lĩnh vực
            </label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="rounded-2xl w-full border border-input bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Chọn ngành nghề" />
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
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Đang chuẩn bị..." : "Bắt đầu khởi tạo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
