"use client";

import React, { useState, useEffect } from "react";
import { userService } from "@/app/services/UserService";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Check, X } from "lucide-react";
import { Spinner } from "@/app/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/app/hooks/useLanguage";
import { UsernameDialogProps } from "@/app/types";
import { slideVariants } from "@/app/contants";
import { getErrorMessage } from "@/app/lib/Utils";

export default function UsernameDialog({
  isOpen,
  onOpenChange,
  currentUser,
  refreshUser,
}: UsernameDialogProps) {
  const { t } = useLanguage();
  const [usernamePhase, setUsernamePhase] = useState(1); // 1: input, 2: password, 3: success
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "available" | "unavailable">("idle");

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setNewUsername("");
      setUsernamePassword("");
      setUsernameStatus("idle");
      setUsernamePhase(1);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    const normalizedUsername = newUsername.trim().toLowerCase();
    const currentUsername = currentUser?.username.toLowerCase();
    const delay = !normalizedUsername || normalizedUsername === currentUsername ? 0 : 500;

    const delayDebounceFn = window.setTimeout(async () => {
      if (!normalizedUsername) {
        setUsernameStatus("idle");
        setIsCheckingUsername(false);
        return;
      }

      if (normalizedUsername === currentUsername) {
        setUsernameStatus("unavailable");
        setIsCheckingUsername(false);
        return;
      }

      setUsernameStatus("idle");
      setIsCheckingUsername(true);

      try {
        const res = await userService.checkUsername(newUsername);
        if (res.success) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("unavailable");
        }
      } catch {
        setUsernameStatus("unavailable");
      } finally {
        setIsCheckingUsername(false);
      }
    }, delay);

    return () => window.clearTimeout(delayDebounceFn);
  }, [newUsername, currentUser?.username]);

  const handleUpdateUsername = async () => {
    if (!usernamePassword) {
      toast.error(t("dialogs.confirmPasswordRequired"));
      return;
    }
    try {
      setIsUpdatingUsername(true);
      const res = await userService.changeUsername({
        newUsername,
        password: usernamePassword,
      });
      if (res.success) {
        await refreshUser();
        setUsernamePhase(3);
      } else {
        toast.error(res.message || t("dialogs.updateUsernameFailed"));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, t("dialogs.updateUsernameError")));
    } finally {
      setIsUpdatingUsername(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] overflow-hidden" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.usernameTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.usernameDesc")}</DialogDescription>
        </DialogHeader>

        <div className="relative pt-2">
          <AnimatePresence mode="wait" custom={usernamePhase}>
            {usernamePhase === 1 && (
              <motion.div
                key="phase1"
                custom={usernamePhase}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 w-full"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{t("dialogs.usernameLabel")}</label>
                  <div className="relative text-left">
                    <Input
                      placeholder={t("dialogs.usernamePlaceholder")}
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      className="rounded-2xl pr-10 text-left"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {isCheckingUsername && <Spinner className="text-muted-foreground" />}
                      {!isCheckingUsername && usernameStatus === "available" && (
                        <Check className="w-5 h-5 text-green-500 animate-in fade-in zoom-in-50 duration-200" />
                      )}
                      {!isCheckingUsername && usernameStatus === "unavailable" && (
                        <X className="w-5 h-5 text-red-500 animate-in fade-in zoom-in-50 duration-200" />
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setUsernamePhase(2)}
                  disabled={isCheckingUsername || usernameStatus !== "available"}
                  className="w-full rounded-2xl cursor-pointer"
                >
                  {t("dialogs.continue")}
                </Button>
              </motion.div>
            )}

            {usernamePhase === 2 && (
              <motion.div
                key="phase2"
                custom={usernamePhase}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4 w-full"
              >
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-muted-foreground">{t("dialogs.usernamePasswordLabel")}</label>
                  <Input
                    type="password"
                    placeholder={t("dialogs.usernamePasswordPlaceholder")}
                    value={usernamePassword}
                    onChange={(e) => setUsernamePassword(e.target.value)}
                    className="rounded-2xl text-left"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setUsernamePhase(1)}
                    className="flex-1 rounded-2xl cursor-pointer"
                  >
                    {t("dialogs.back")}
                  </Button>
                  <Button
                    onClick={handleUpdateUsername}
                    disabled={isUpdatingUsername}
                    className="flex-1 rounded-2xl cursor-pointer"
                  >
                    {isUpdatingUsername ? <Spinner className="size-4 text-background" /> : t("common.confirm")}
                  </Button>
                </div>
              </motion.div>
            )}

            {usernamePhase === 3 && (
              <motion.div
                key="phase3"
                custom={usernamePhase}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center justify-center space-y-4 w-full text-center py-4"
              >
                <Check className="w-16 h-16 text-primary" />
                <div>
                  <h3 className="font-bold text-lg">{t("dialogs.usernameSuccessTitle")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("dialogs.usernameSuccessDesc").replace("{{username}}", newUsername)}
                  </p>
                </div>
                <Button onClick={() => onOpenChange(false)} className="w-full rounded-2xl cursor-pointer">
                  {t("dialogs.close")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
