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
import { AnimatePresence, motion, Variants } from "framer-motion";
import { Spinner } from "@/app/components/ui/spinner";
import { useLanguage } from "@/app/hooks/useLanguage";

interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { email: string } | null;
  refreshUser: () => Promise<void>;
}

export default function EmailDialog({
  isOpen,
  onOpenChange,
  currentUser,
  refreshUser,
}: EmailDialogProps) {
  const { t } = useLanguage();
  const [emailPhase, setEmailPhase] = useState(1); // 1: verify current pin, 2: enter new email, 3: verify new pin
  const [currentPin, setCurrentPin] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailPin, setNewEmailPin] = useState("");
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Trigger sending current PIN on dialog open
  useEffect(() => {
    if (isOpen) {
      setCurrentPin("");
      setNewEmail("");
      setNewEmailPin("");
      setEmailPhase(1);
      sendCurrentOtp();
    }
  }, [isOpen]);

  const sendCurrentOtp = async () => {
    try {
      setIsEmailSending(true);
      const res = await userService.changeEmail({ action: "send-current-pin" });
      if (!res.success) {
        toast.error(res.message || t("dialogs.otpSendFailed"));
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("dialogs.emailResendError"));
      onOpenChange(false);
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleVerifyCurrentPin = async () => {
    if (currentPin.length !== 6) {
      toast.error(t("dialogs.otpRequired"));
      return;
    }
    try {
      setIsEmailSending(true);
      const res = await userService.changeEmail({
        action: "verify-current-pin",
        pin: currentPin,
      });
      if (res.success) {
        toast.success(t("dialogs.verifyCurrentSuccess"));
        setEmailPhase(2);
      } else {
        toast.error(res.message || t("dialogs.otpVerifyFailed"));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("dialogs.otpVerifyFailed"));
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleSendNewPin = async () => {
    if (!newEmail) {
      toast.error(t("dialogs.invalidEmail"));
      return;
    }
    try {
      setIsEmailSending(true);
      const res = await userService.changeEmail({
        action: "send-new-pin",
        newEmail,
      });
      if (res.success) {
        setEmailPhase(3);
      } else {
        toast.error(res.message || t("dialogs.emailUnavailable"));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("dialogs.otpSendFailed"));
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleVerifyNewPin = async () => {
    if (newEmailPin.length !== 6) {
      toast.error(t("dialogs.otpRequired"));
      return;
    }
    try {
      setIsEmailSending(true);
      const res = await userService.changeEmail({
        action: "verify-new-pin",
        pin: newEmailPin,
      });
      if (res.success) {
        toast.success(t("dialogs.otpVerifySuccess"));
        await refreshUser();
        onOpenChange(false);
      } else {
        toast.error(res.message || t("dialogs.otpVerifyFailed"));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("dialogs.otpVerifyFailed"));
    } finally {
      setIsEmailSending(false);
    }
  };

  const slideVariants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 150 : -150,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 150 : -150,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeInOut" },
    }),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] overflow-hidden" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.emailTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.emailDesc")}</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mt-3 px-1 border-b border-border/10 pb-3">
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
            {emailPhase === 1 && t("dialogs.emailStep1")}
            {emailPhase === 2 && t("dialogs.emailStep2")}
            {emailPhase === 3 && t("dialogs.emailStep3")}
          </span>
          <div className="flex gap-1.5">
            <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${emailPhase >= 1 ? "bg-primary" : "bg-muted/40"}`} />
            <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${emailPhase >= 2 ? "bg-primary" : "bg-muted/40"}`} />
            <span className={`h-1.5 w-6 rounded-full transition-all duration-300 ${emailPhase >= 3 ? "bg-primary" : "bg-muted/40"}`} />
          </div>
        </div>

        <div className="relative pt-2">
          {isEmailSending && emailPhase === 1 && currentPin === "" ? (
            <div className="flex flex-col items-center justify-center min-h-[150px] space-y-3">
              <Spinner className="size-8 text-primary" />
              <p className="text-sm text-muted-foreground">{t("dialogs.sendingOtp")}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={emailPhase}>
              {emailPhase === 1 && (
                <motion.div
                  key="email1"
                  custom={emailPhase}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 w-full"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {t("dialogs.otpSentTo")} <span className="text-foreground font-semibold block mt-1">{currentUser?.email}</span>
                    </label>
                    <Input
                      maxLength={6}
                      placeholder={t("dialogs.emailOtpPlaceholder")}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                      className="rounded-2xl text-center font-mono text-lg placeholder:tracking-normal placeholder:font-sans tracking-[0.5em] placeholder:text-muted-foreground/40 bg-background/50 border-border/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 py-6 h-12 transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleVerifyCurrentPin}
                    disabled={isEmailSending}
                    className="w-full rounded-2xl cursor-pointer"
                  >
                    {isEmailSending ? t("common.loading") : t("dialogs.emailVerifyOtp")}
                  </Button>
                </motion.div>
              )}

              {emailPhase === 2 && (
                <motion.div
                  key="email2"
                  custom={emailPhase}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 w-full text-left"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">{t("dialogs.emailLabel")}</label>
                    <Input
                      type="email"
                      placeholder="example@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="rounded-2xl bg-background/50 border-border/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 h-12 transition-all text-left"
                    />
                  </div>
                  <Button
                    onClick={handleSendNewPin}
                    disabled={isEmailSending}
                    className="w-full rounded-2xl cursor-pointer"
                  >
                    {isEmailSending ? <Spinner className="size-4 text-background" /> : t("dialogs.emailSendOtp")}
                  </Button>
                </motion.div>
              )}

              {emailPhase === 3 && (
                <motion.div
                  key="email3"
                  custom={emailPhase}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4 w-full"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {t("dialogs.otpSentToNew")} <span className="text-foreground font-semibold block mt-1">{newEmail}</span>
                    </label>
                    <Input
                      maxLength={6}
                      placeholder={t("dialogs.emailOtpPlaceholder")}
                      value={newEmailPin}
                      onChange={(e) => setNewEmailPin(e.target.value.replace(/\D/g, ""))}
                      className="rounded-2xl text-center font-mono text-lg placeholder:tracking-normal placeholder:font-sans tracking-[0.5em] placeholder:text-muted-foreground/40 bg-background/50 border-border/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 py-6 h-12 transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleVerifyNewPin}
                    disabled={isEmailSending}
                    className="w-full rounded-2xl cursor-pointer"
                  >
                    {isEmailSending ? <Spinner className="size-4 text-background" /> : t("common.confirm")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
