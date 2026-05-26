"use client";

import React, { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { WalletMoney, History, Chart, CpuBolt, ShieldCheck } from "@solar-icons/react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import RechargeDrawer from "@/app/components/common/Drawer/RechargeDrawer";

interface CreditPageProps {
  setActiveTab: (tab: string) => void;
  creditLogs: any[];
  transactions: any[];
  isLoading: boolean;
}

export default function CreditPage({ setActiveTab, creditLogs, transactions, isLoading }: CreditPageProps) {
  const { user } = useAuthContext();
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);

  const totalRechargedVND = transactions
    .filter((tx) => tx.status === "PAID")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalUsedCredits = creditLogs
    .filter((log) => log.credits < 0)
    .reduce((sum, log) => sum + Math.abs(log.credits), 0);

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">Số dư ví</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý số dư, xem chi tiết hạn mức và các dịch vụ AI phỏng vấn của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-tr from-primary via-violet-600 to-indigo-600 p-6 text-white shadow-xl shadow-primary/10 flex flex-col justify-between min-h-[180px]">
          {/* Background Decorative Circles */}
          <div className="absolute right-[-40px] top-[-40px] w-40 h-40 rounded-full bg-white/5 blur-xl"></div>
          <div className="absolute left-[-20px] bottom-[-20px] w-32 h-32 rounded-full bg-black/10 blur-xl"></div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Số dư khả dụng</p>
              <p className="text-4xl font-extrabold mt-2 tracking-tight">
                {isLoading ? "..." : (user?.credits !== undefined ? user.credits.toLocaleString("vi-VN") : "0")} Credits
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-white">
              <WalletMoney className="w-8 h-8" />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              className="bg-white text-primary hover:bg-white/90 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-white/5 cursor-pointer flex-1"
              onClick={() => setIsRechargeOpen(true)}
            >
              Nạp tiền ngay
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 rounded-2xl px-5 py-2.5 text-xs font-semibold cursor-pointer flex-1"
              onClick={() => setActiveTab("used")}
            >
              Xem lịch sử sử dụng
            </Button>
          </div>
        </div>

        {/* Info stats */}
        <div className="flex flex-col gap-4">
          <Card className="border border-border/20 bg-card/20 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-green-500/10 text-green-400">
                <WalletMoney className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng nạp</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {isLoading ? "..." : `${totalRechargedVND.toLocaleString("vi-VN")} đ`}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border border-border/20 bg-card/20 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-400">
                <Chart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đã sử dụng</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {isLoading ? "..." : `${totalUsedCredits.toLocaleString("vi-VN")} Credits`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Notice/FAQs */}
      <Card className="border border-border/20 bg-card/10 backdrop-blur-sm rounded-3xl p-5 flex items-start gap-4">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
          <p className="font-bold text-foreground text-sm">Một số lưu ý quan trọng:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Số tiền đã nạp không thể quy đổi ngược lại thành tiền mặt trong mọi trường hợp.</li>
            <li>Mỗi lượt phỏng vấn bị gián đoạn do lỗi kết nối từ phía máy chủ sẽ được hoàn trả 100% chi phí.</li>
            <li>Hỗ trợ khách hàng 24/7 qua mục liên hệ hoặc email hỗ trợ: support@interv.vn.</li>
          </ul>
        </div>
      </Card>

      <RechargeDrawer isOpen={isRechargeOpen} onOpenChange={setIsRechargeOpen} />
    </div>
  );
}
