"use client";

import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { WalletMoney, AltArrowLeft, ArrowRightUp } from "@solar-icons/react";
import { Spinner } from "@/app/components/ui/spinner";
import api from "@/app/lib/Client";
import { RECHARGE_PACKAGES } from "@/app/contants";

interface RechargePackage {
  amount: number;
  credit: number;
  bonus: number;
  popular?: boolean;
}

interface RechargeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RechargeDrawer({ isOpen, onOpenChange }: RechargeDrawerProps) {
  const { user, refreshUser } = useAuthContext();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  
  // PayOS states
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedPackage(null);
      setPaymentUrl("");
      setOrderCode(null);
      setIsLoadingLink(false);
      setIsVerifying(false);
    }
  }, [isOpen]);

  // Polling payment status in background
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 2 && orderCode && isOpen) {
      const pollStatus = async () => {
        try {
          const isMock = paymentUrl.includes("mock=true");
          const response = await api.post("/payment/verify", { orderCode, mock: isMock });
          if (response.data.success && response.data.status === "PAID") {
            toast.success("Nạp tiền thành công! Số dư tài khoản đã được cập nhật.");
            await refreshUser();
            onOpenChange(false);
          }
        } catch (error) {
          console.error("Polling payment status error:", error);
        }
      };

      // Poll every 4 seconds
      intervalId = setInterval(pollStatus, 4000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [step, orderCode, isOpen, paymentUrl, refreshUser, onOpenChange]);

  const handleContinuePayment = async () => {
    if (!selectedPackage) return;
    try {
      setIsLoadingLink(true);
      setStep(2);
      const response = await api.post("/payment/create", { amount: selectedPackage.amount });
      if (response.data.success) {
        setPaymentUrl(response.data.paymentUrl);
        setOrderCode(response.data.orderCode);
      } else {
        toast.error(response.data.message || "Không thể tạo liên kết thanh toán");
        setStep(1);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tạo liên kết thanh toán. Vui lòng thử lại.");
      setStep(1);
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleManualVerify = async () => {
    if (!orderCode) return;
    try {
      setIsVerifying(true);
      const isMock = paymentUrl.includes("mock=true");
      const response = await api.post("/payment/verify", { orderCode, mock: isMock });
      if (response.data.success && response.data.status === "PAID") {
        toast.success("Xác nhận nạp tiền thành công!");
        await refreshUser();
        onOpenChange(false);
      } else if (response.data.status === "PENDING") {
        toast.info("Hệ thống chưa nhận được thanh toán. Vui lòng hoàn tất giao dịch.");
      } else {
        toast.error(response.data.message || "Giao dịch không thành công");
      }
    } catch (error: any) {
      toast.error("Không thể xác minh giao dịch. Vui lòng thử lại.");
    } finally {
      setIsVerifying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-none w-full p-0 rounded-t-[32px] border-t border-border/10 bg-background/95 backdrop-blur-xl before:hidden overflow-hidden shadow-2xl">
        
        {/* Step 1: Chọn gói nạp */}
        {step === 1 && (
          <div className="w-full px-6 pt-2 pb-6 flex flex-col">
            <DrawerHeader className="px-0 pt-4 pb-2 text-left">
              <DrawerTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <WalletMoney className="w-6 h-6 text-primary" />
                Nạp tiền vào ví
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground mt-1">
                Quy đổi tiền nạp thành Credit để sử dụng các dịch vụ luyện tập phỏng vấn AI. Nạp gói lớn nhận thêm Credit bonus!
              </DrawerDescription>
            </DrawerHeader>

            {/* Packages Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 my-3 p-1.5">
              {RECHARGE_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage?.amount === pkg.amount;
                return (
                  <button
                    key={pkg.amount}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative flex flex-col items-center justify-between p-4 rounded-3xl border text-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5 scale-[1.02]"
                        : "border-border/30 hover:border-border/80 hover:bg-muted/5 bg-card/20"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1 mt-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">
                        {formatCurrency(pkg.amount)}
                      </p>
                      <p className="text-xl font-black text-foreground tracking-tight">
                        {(pkg.credit + pkg.bonus).toLocaleString("vi-VN")}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">Credits</p>
                    </div>

                    {pkg.bonus > 0 ? (
                      <div className="mt-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 flex items-center justify-center">
                        +{pkg.bonus} bonus
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
                  Hủy bỏ
                </Button>
              </DrawerClose>
              <Button
                disabled={!selectedPackage}
                onClick={handleContinuePayment}
                className="flex-1 rounded-2xl py-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/10"
              >
                Tiếp tục thanh toán
              </Button>
            </DrawerFooter>
          </div>
        )}

        {/* Step 2: Thanh toán cổng PayOS */}
        {step === 2 && selectedPackage && (
          <div className="w-full px-6 pt-2 pb-6 flex flex-col">
            <DrawerHeader className="px-0 pt-4 pb-2 text-left">
              <div className="flex items-center gap-2">
                <button
                  disabled={isLoadingLink}
                  onClick={() => setStep(1)}
                  className="p-1.5 rounded-xl hover:bg-muted/10 transition-colors text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                >
                  <AltArrowLeft className="w-5 h-5" />
                </button>
                <DrawerTitle className="text-lg font-extrabold text-foreground">
                  Thanh toán qua cổng PayOS
                </DrawerTitle>
              </div>
              <DrawerDescription className="text-xs text-muted-foreground mt-1">
                Giao dịch được xử lý an toàn qua nền tảng thanh toán PayOS (chuyển khoản VietQR nhanh, thẻ ngân hàng).
              </DrawerDescription>
            </DrawerHeader>

            <div className="my-6 min-h-[160px] flex flex-col items-center justify-center border border-dashed border-border/20 rounded-3xl bg-card/10 p-6 text-center">
              {isLoadingLink ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="w-8 h-8 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Đang khởi tạo liên kết thanh toán...</p>
                </div>
              ) : (
                <div className="space-y-4 w-full max-w-sm">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground">Gói nạp đã chọn</span>
                    <h3 className="text-2xl font-black text-foreground mt-0.5">
                      {(selectedPackage.credit + selectedPackage.bonus).toLocaleString("vi-VN")} Credits
                    </h3>
                    <p className="text-sm font-semibold text-primary mt-1">
                      Thành tiền: {formatCurrency(selectedPackage.amount)}
                    </p>
                  </div>

                  <Button
                    onClick={() => window.open(paymentUrl, "_blank")}
                    className="w-full rounded-2xl py-6 font-bold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white transition-all cursor-pointer shadow-md shadow-primary/10 flex items-center justify-center gap-2"
                  >
                    Mở cổng thanh toán PayOS
                    <ArrowRightUp className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Đang chờ bạn chuyển khoản... Tự động cộng credits khi hoàn tất.
                  </div>
                </div>
              )}
            </div>

            <DrawerFooter className="px-0 pt-2 flex flex-row gap-3">
              <Button
                variant="outline"
                disabled={isLoadingLink}
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl py-5 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Quay lại
              </Button>
              <Button
                disabled={isLoadingLink || isVerifying || !paymentUrl}
                onClick={handleManualVerify}
                className="flex-1 rounded-2xl py-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying && <Spinner className="w-3.5 h-3.5" />}
                Tôi đã thanh toán
              </Button>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
