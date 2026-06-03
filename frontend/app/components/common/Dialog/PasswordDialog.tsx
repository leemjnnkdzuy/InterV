"use client";

import React, { useState, useEffect } from "react";
import { userService } from "@/app/services/UserService";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { useLanguage } from "@/app/hooks/useLanguage";

interface PasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PasswordDialog({ isOpen, onOpenChange }: PasswordDialogProps) {
  const { t } = useLanguage();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error(t("dialogs.fillAllFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("dialogs.passwordsNotMatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("dialogs.passwordMinLength"));
      return;
    }
    try {
      setIsUpdatingPassword(true);
      const res = await userService.changePassword({
        oldPassword,
        newPassword,
      });
      if (res.success) {
        toast.success(t("dialogs.updatePasswordSuccess"));
        onOpenChange(false);
      } else {
        toast.error(res.message || t("dialogs.updatePasswordFailed"));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("dialogs.updatePasswordError"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.passwordTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.passwordDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-left">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">{t("dialogs.currentPasswordLabel")}</label>
            <Input
              type="password"
              placeholder={t("dialogs.currentPasswordPlaceholder")}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="rounded-2xl text-left"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">{t("dialogs.newPasswordLabel")}</label>
            <Input
              type="password"
              placeholder={t("dialogs.newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-2xl text-left"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">{t("dialogs.confirmNewPasswordLabel")}</label>
            <Input
              type="password"
              placeholder={t("dialogs.confirmNewPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-2xl text-left"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-2xl cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className="flex-1 rounded-2xl cursor-pointer"
            >
              {isUpdatingPassword ? t("common.loading") : t("common.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
