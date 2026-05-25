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

interface PasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PasswordDialog({ isOpen, onOpenChange }: PasswordDialogProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ các trường");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự");
      return;
    }
    try {
      setIsUpdatingPassword(true);
      const res = await userService.changePassword({
        oldPassword,
        newPassword,
      });
      if (res.success) {
        toast.success("Thay đổi mật khẩu thành công!");
        onOpenChange(false);
      } else {
        toast.error(res.message || "Mật khẩu cũ không chính xác");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi thay đổi mật khẩu");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Thay đổi mật khẩu</DialogTitle>
          <DialogDescription>Mật khẩu mới phải có tối thiểu 6 ký tự để đảm bảo tính bảo mật.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Mật khẩu hiện tại</label>
            <Input
              type="password"
              placeholder="Nhập mật khẩu cũ..."
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Mật khẩu mới</label>
            <Input
              type="password"
              placeholder="Mật khẩu mới..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Nhập lại mật khẩu mới</label>
            <Input
              type="password"
              placeholder="Nhập lại mật khẩu mới..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-2xl"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-2xl cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword}
              className="flex-1 rounded-2xl cursor-pointer"
            >
              {isUpdatingPassword ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
