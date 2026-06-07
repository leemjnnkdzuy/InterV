"use client";

import React from "react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { TrashBinMinimalistic } from "@solar-icons/react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  description?: string;
  isSubmitting?: boolean;
}

export default function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title = "Xóa buổi luyện tập",
  itemName,
  description = "Hành động này không thể hoàn tác. Tất cả dữ liệu và lịch sử liên quan đến buổi luyện tập này sẽ bị xóa vĩnh viễn.",
  isSubmitting = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" showCloseButton={true}>
        <div className="flex flex-col items-center text-center pt-4">
          {/* Danger icon with red glow */}
          <div className="text-rose-500 mb-4 animate-in zoom-in duration-200">
            <TrashBinMinimalistic weight="BoldDuotone" className="w-14 h-14" />
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold text-foreground text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs text-center max-w-sm leading-relaxed">
              {itemName ? (
                <>
                  Bạn có chắc chắn muốn xóa <span className="font-extrabold text-foreground">&quot;{itemName}&quot;</span> không? {description}
                </>
              ) : (
                description
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-6 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-2xl cursor-pointer"
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/10"
            >
              {isSubmitting ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
