"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { WalletMoney, CheckCircle, DangerCircle } from "@solar-icons/react";

import { useAuthContext } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/app/components/ui/drawer";
import { Spinner } from "@/app/components/ui/spinner";
import { Odometer } from "@/app/components/ui/odometer";
import { RECHARGE_PACKAGES } from "@/app/contants";
import { formatCurrency, getErrorMessage } from "@/app/lib/Utils";
import { paymentService } from "@/app/services";
import type {
  CreatePaymentResponse,
  RechargePackage,
  RechargeDrawerProps,
} from "@/app/types";
import { useLanguage } from "@/app/hooks/useLanguage";

type PaymentPhase = "qr" | "success" | "expired";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function packageForPayment(payment: CreatePaymentResponse): RechargePackage | undefined {
  return (
    RECHARGE_PACKAGES.find((item) => item.id === payment.packageId) ||
    RECHARGE_PACKAGES.find((item) => item.amount === payment.amount)
  );
}

export default function RechargeDrawer({
  isOpen,
  onOpenChange,
  onPendingPaymentChange,
  resumePendingPayment = false,
}: RechargeDrawerProps) {
  const { refreshUser, user } = useAuthContext();
  const { language, t } = useLanguage();
  const numberLocale = language === "zh" ? "zh-CN" : language === "en" ? "en-US" : "vi-VN";

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
  const [phase, setPhase] = useState<PaymentPhase>("qr");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isQrLoaded, setIsQrLoaded] = useState(false);
  const [generatedQrImage, setGeneratedQrImage] = useState<{
    payload: string;
    dataUrl: string;
  } | null>(null);
  const wasOpenRef = useRef(false);

  const hasPendingPayment = Boolean(paymentData && phase === "qr" && timeLeft > 0);

  useEffect(() => {
    const payload = paymentData?.qrCode?.trim();
    if (!payload) return;

    let cancelled = false;
    const renderQrCode = async () => {
      try {
        const dataUrl = payload.startsWith("data:image/")
          ? payload
          : await QRCode.toDataURL(payload, {
              errorCorrectionLevel: "M",
              margin: 1,
              width: 480,
            });

        if (!cancelled) {
          setGeneratedQrImage({ payload, dataUrl });
        }
      } catch (error) {
        if (!cancelled) console.warn("Could not render payment QR code:", error);
      }
    };

    void renderQrCode();
    return () => {
      cancelled = true;
    };
  }, [paymentData?.qrCode]);

  useEffect(() => {
    const didOpen = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!didOpen) return;

    let cancelled = false;
    const shouldResumePendingPayment = resumePendingPayment;

    const restorePendingPayment = async () => {
      setStep(shouldResumePendingPayment ? 2 : 1);
      setSelectedPackage(null);
      setPaymentData(null);
      setPhase("qr");
      setTimeLeft(0);
      setIsLoadingLink(false);
      setIsVerifying(false);
      setIsCancelling(false);
      setIsQrLoaded(false);
      setIsRestoring(true);

      try {
        const response = await paymentService.getPendingPayment();
        if (cancelled) return;
        if (!response.paymentData) {
          onPendingPaymentChange?.(false);
          setStep(1);
          return;
        }

        const pending = response.paymentData;
        const pkg = packageForPayment(pending);
        if (!pkg) {
          onPendingPaymentChange?.(false);
          setStep(1);
          return;
        }

        const remaining = Math.max(0, Math.floor((pending.expiredAt - Date.now()) / 1000));
        onPendingPaymentChange?.(remaining > 0);
        setSelectedPackage(pkg);
        setPaymentData(pending);
        setPhase(remaining > 0 ? "qr" : "expired");
        setTimeLeft(remaining);
        setStep(2);
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not restore pending payment:", error);
        }
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };

    const timeoutId = window.setTimeout(() => void restorePendingPayment(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, onPendingPaymentChange, resumePendingPayment]);

  useEffect(() => {
    if (!isOpen || step !== 2 || phase !== "qr" || !paymentData) return;

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((paymentData.expiredAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        onPendingPaymentChange?.(false);
        setPhase("expired");
        toast.error(t("credit.paymentExpired"));
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, step, phase, paymentData, onPendingPaymentChange, t]);

  useEffect(() => {
    if (!isOpen || step !== 2 || phase !== "qr" || !paymentData) return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const response = await paymentService.checkPaymentStatus(paymentData.orderCode);
        if (cancelled) return;

        if (response.status === "PAID") {
          onPendingPaymentChange?.(false);
          setPhase("success");
          if (typeof response.balance === "number") {
            await refreshUser();
          } else {
            await refreshUser();
          }
          toast.success(t("credit.paymentPollSuccess"));
        } else if (response.status === "EXPIRED") {
          onPendingPaymentChange?.(false);
          setPhase("expired");
          toast.error(t("credit.paymentExpired"));
        } else if (response.status === "CANCELLED") {
          onPendingPaymentChange?.(false);
          setPaymentData(null);
          setSelectedPackage(null);
          setStep(1);
          toast.info(t("credit.paymentCancelled"));
        }
      } catch (error) {
        if (!cancelled) console.warn("Polling payment status error:", error);
      }
    };

    void pollStatus();
    const interval = window.setInterval(() => void pollStatus(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isOpen, step, phase, paymentData, onPendingPaymentChange, refreshUser, t]);

  const continueWithPendingPayment = () => {
    if (paymentData && phase === "qr" && timeLeft > 0) {
      setStep(2);
    }
  };

  const loadPendingAfterConflict = async () => {
    const response = await paymentService.getPendingPayment();
    if (!response.paymentData) return false;

    const pending = response.paymentData;
    const pkg = packageForPayment(pending);
    if (!pkg) return false;

    setSelectedPackage(pkg);
    setPaymentData(pending);
    onPendingPaymentChange?.(true);
    setPhase("qr");
    setTimeLeft(Math.max(0, Math.floor((pending.expiredAt - Date.now()) / 1000)));
    setIsQrLoaded(false);
    setStep(2);
    return true;
  };

  const handleContinuePayment = async () => {
    if (!selectedPackage) return;
    if (hasPendingPayment) {
      continueWithPendingPayment();
      return;
    }

    try {
      setIsLoadingLink(true);
      const response = await paymentService.createPayment(selectedPackage.id);
      onPendingPaymentChange?.(true);
      setPaymentData(response);
      setPhase("qr");
      setTimeLeft(Math.max(0, Math.floor((response.expiredAt - Date.now()) / 1000)));
      setIsQrLoaded(false);
      setStep(2);
    } catch (error: unknown) {
      try {
        const restored = await loadPendingAfterConflict();
        if (restored) {
          toast.info(t("credit.paymentPendingExists"));
          return;
        }
      } catch {
        // Show the original payment creation error below.
      }
      toast.error(getErrorMessage(error, t("credit.createPaymentError")));
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleManualVerify = async () => {
    if (!paymentData) return;
    try {
      setIsVerifying(true);
      const response = await paymentService.verifyPayment(paymentData.orderCode);
      if (response.status === "PAID") {
        onPendingPaymentChange?.(false);
        await refreshUser();
        setPhase("success");
        toast.success(t("credit.verifySuccess"));
      } else if (response.status === "EXPIRED") {
        onPendingPaymentChange?.(false);
        setPhase("expired");
        toast.error(t("credit.paymentExpired"));
      } else if (response.status === "CANCELLED") {
        onPendingPaymentChange?.(false);
        setPaymentData(null);
        setSelectedPackage(null);
        setStep(1);
        toast.info(t("credit.paymentCancelled"));
      } else {
        toast.info(t("credit.verifyPending"));
      }
    } catch {
      toast.error(t("credit.verifyFailed"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!paymentData) return;
    try {
      setIsCancelling(true);
      await paymentService.cancelPayment(paymentData.orderCode);
      onPendingPaymentChange?.(false);
      setPaymentData(null);
      setSelectedPackage(null);
      setStep(1);
      toast.info(t("credit.paymentCancelled"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("credit.cancelPaymentError")));
    } finally {
      setIsCancelling(false);
    }
  };

  const checkoutUrl = paymentData?.paymentUrl || paymentData?.checkoutUrl;
  const displayedBalance = user?.credits ?? paymentData?.credits ?? 0;
  const shouldShowPendingRestore = Boolean(
    isOpen && resumePendingPayment && phase === "qr" && !paymentData
  );
  const renderedStep = shouldShowPendingRestore ? 2 : step;
  const isPendingRestore = isRestoring || shouldShowPendingRestore;
  const qrPayload = paymentData?.qrCode?.trim();
  const qrImageSource = qrPayload
    ? generatedQrImage?.payload === qrPayload
      ? generatedQrImage.dataUrl
      : undefined
    : paymentData?.qrImageUrl;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-none w-full p-0 rounded-t-[32px] border-t border-border/10 bg-background/95 backdrop-blur-xl before:hidden overflow-hidden shadow-2xl">
        {renderedStep === 1 && (
          <div className="w-full px-6 pt-2 pb-6 flex flex-col">
            <DrawerHeader className="px-0 pt-4 pb-2 text-left">
              <DrawerTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <WalletMoney className="w-6 h-6 text-primary" weight="BoldDuotone" />
                {t("credit.drawerTitle")}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground mt-1">
                {isRestoring ? t("credit.restoringPayment") : t("credit.drawerDescription")}
              </DrawerDescription>
            </DrawerHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 my-3 p-1.5">
              {RECHARGE_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const isLocked = hasPendingPayment && !isSelected;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled={isLocked || isRestoring}
                    onClick={() => {
                      if (hasPendingPayment && !isSelected) {
                        toast.info(t("credit.paymentPendingExists"));
                        return;
                      }
                      setSelectedPackage((current) => (current?.id === pkg.id ? null : pkg));
                    }}
                    className={`relative flex flex-col items-center justify-between p-4 rounded-3xl border text-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                      isLocked
                        ? "border-border/10 bg-card/10 opacity-40"
                        : isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/5 scale-[1.02]"
                          : "border-border/30 hover:border-border/80 hover:bg-muted/5 bg-card/20"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1 mt-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">
                        {formatCurrency(pkg.amount)}
                      </p>
                      <p className="text-xl font-black text-foreground tracking-tight">
                        {(pkg.credit + pkg.bonus).toLocaleString(numberLocale)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">Credits</p>
                    </div>
                    {pkg.bonus > 0 ? (
                      <div className="mt-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 flex items-center justify-center">
                        {t("credit.bonus", { bonus: pkg.bonus })}
                      </div>
                    ) : (
                      <div className="mt-2.5 h-[17px] w-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <DrawerFooter className="px-0 pt-2 flex flex-row gap-3">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1 rounded-2xl py-5 text-xs font-semibold cursor-pointer">
                  {t("credit.cancel")}
                </Button>
              </DrawerClose>
              <Button
                disabled={!selectedPackage || isLoadingLink || isRestoring}
                onClick={handleContinuePayment}
                className="flex-1 rounded-2xl py-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/10"
              >
                {isLoadingLink ? <Spinner className="w-4 h-4" /> : null}
                {hasPendingPayment ? t("credit.resumePayment") : t("credit.continuePayment")}
              </Button>
            </DrawerFooter>
          </div>
        )}

        {renderedStep === 2 && phase === "qr" && (paymentData || isPendingRestore) && (
          <div className="w-full px-6 pt-2 pb-6 flex flex-col">
            <DrawerHeader className="px-0 pt-4 pb-2 text-left">
              <DrawerTitle className="text-lg font-extrabold text-foreground">
                {t("credit.payosTitle")}
              </DrawerTitle>
            </DrawerHeader>

            <div className="my-6 min-h-[220px] flex flex-col items-center justify-center border border-dashed border-border/20 rounded-3xl bg-card/10 p-6 text-center">
              {isLoadingLink || isPendingRestore || !paymentData ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="w-8 h-8 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {isPendingRestore ? t("credit.restoringPayment") : t("credit.loadingPaymentLink")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 w-full max-w-sm">
                  {qrImageSource ? (
                    <div className="relative mx-auto flex size-44 items-center justify-center overflow-hidden rounded-2xl border border-border/20 bg-white p-2 shadow-md">
                      {!isQrLoaded && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                          <Spinner className="size-7 text-primary" />
                        </div>
                      )}
                      <Image
                        src={qrImageSource}
                        alt={t("credit.qrAlt")}
                        width={176}
                        height={176}
                        unoptimized
                        onLoad={() => setIsQrLoaded(true)}
                        className={`size-full object-contain transition-all duration-500 ${
                          isQrLoaded ? "scale-100 blur-0 opacity-100" : "scale-95 blur-md opacity-0"
                        }`}
                      />
                    </div>
                  ) : qrPayload ? (
                    <div className="relative mx-auto flex size-44 items-center justify-center overflow-hidden rounded-2xl border border-border/20 bg-white p-2 shadow-md">
                      <Spinner className="size-7 text-primary" />
                    </div>
                  ) : null}
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">
                      {t("credit.selectedPackage")}
                    </span>
                    <h3 className="text-2xl font-black text-foreground mt-0.5">
                      {paymentData.credits.toLocaleString(numberLocale)} Credits
                    </h3>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {t("credit.totalAmount", { amount: formatCurrency(paymentData.amount) })}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-500">
                    <span>{t("credit.expiresIn")}</span>
                    <Odometer value={formatTime(timeLeft)} className="text-sm font-bold" />
                  </div>
                </div>
              )}
            </div>

            {paymentData && !isPendingRestore && (
              <DrawerFooter className="px-0 pt-2 flex flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoadingLink || isCancelling}
                  onClick={handleCancelPayment}
                  className="flex-1 rounded-2xl py-5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? <Spinner className="w-3.5 h-3.5" /> : t("credit.cancelPayment")}
                </Button>
                <Button
                  type="button"
                  disabled={isLoadingLink || isVerifying || !checkoutUrl}
                  onClick={handleManualVerify}
                  className="flex-1 rounded-2xl py-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying && <Spinner className="w-3.5 h-3.5" />}
                  {t("credit.paidButton")}
                </Button>
              </DrawerFooter>
            )}
          </div>
        )}

        {renderedStep === 2 && paymentData && phase === "expired" && (
          <div className="w-full px-6 pt-8 pb-8 flex flex-col items-center text-center">
            <DangerCircle className="size-16 text-amber-500" weight="BoldDuotone" />
            <h3 className="mt-4 text-xl font-extrabold text-foreground">{t("credit.paymentExpired")}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("credit.paymentExpiredDescription")}</p>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 w-full max-w-sm rounded-2xl py-5 text-xs font-bold"
            >
              {t("credit.close")}
            </Button>
          </div>
        )}

        {renderedStep === 2 && paymentData && phase === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full px-6 pt-8 pb-8 flex flex-col items-center text-center"
          >
            <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle className="size-12" weight="BoldDuotone" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.3, opacity: 0.4 }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="absolute inset-0 rounded-full border-2 border-emerald-500"
              />
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-foreground">{t("credit.paymentSuccessTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("credit.paymentSuccessDescription")}</p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("credit.newBalance")}</p>
              <Odometer
                value={displayedBalance}
                locale={numberLocale}
                suffix=" Credits"
                className="mt-2 text-3xl font-black text-primary"
              />
            </div>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 w-full max-w-sm rounded-2xl py-5 text-xs font-bold"
            >
              {t("credit.complete")}
            </Button>
          </motion.div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
