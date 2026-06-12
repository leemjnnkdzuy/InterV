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
import { ConfirmDeleteDialogProps } from "@/app/types";
import { useLanguage } from "@/app/hooks/useLanguage";


export default function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  itemName,
  description,
  isSubmitting = false,
}: ConfirmDeleteDialogProps) {
  const { t } = useLanguage();
  const dialogTitle = title || t("confirmDelete.title");
  const dialogDescription = description || t("confirmDelete.description");

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
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs text-center max-w-sm leading-relaxed">
              {itemName ? (
                <>
                  {t("confirmDelete.question", { name: itemName })} {dialogDescription}
                </>
              ) : (
                dialogDescription
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
              {t("confirmDelete.cancel")}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/10"
            >
              {isSubmitting ? t("confirmDelete.submitting") : t("confirmDelete.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
