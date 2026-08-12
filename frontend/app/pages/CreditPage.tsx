"use client";

import React, { useState } from "react";
import { Card as CardUI } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { WalletMoney, Chart, ShieldCheck, Card } from "@solar-icons/react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import RechargeDrawer from "@/app/components/common/Drawer/RechargeDrawer";
import { Skeleton } from "@/app/components/ui/skeleton";
import type { CreditPageProps } from "@/app/types";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function CreditPage({ setActiveTab, creditLogs, transactions, isLoading }: CreditPageProps) {
  const { user } = useAuthContext();
  const { language, t } = useLanguage();
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const numberLocale = language === "zh" ? "zh-CN" : language === "en" ? "en-US" : "vi-VN";

  const totalRechargedVND = transactions
    .filter((tx) => tx.status === "PAID")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalUsedCredits = creditLogs
    .filter((log) => log.credits < 0)
    .reduce((sum, log) => sum + Math.abs(log.credits), 0);

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("credit.walletTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("credit.walletDescription")}
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
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{t("credit.availableBalance")}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {user ? (
                  <span className="text-4xl font-extrabold tracking-tight">
                    {user?.credits !== undefined ? user.credits.toLocaleString(numberLocale) : "0"}
                  </span>
                ) : (
                  <Skeleton className="h-9 w-24 bg-white/20" />
                )}
                <span className="text-4xl font-extrabold tracking-tight">Credits</span>
              </div>
            </div>
            <Card weight="BoldDuotone" className="w-10 h-10 text-white shrink-0" />
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="ghost"
              className="border border-white/20 text-white hover:bg-white/10 hover:text-white rounded-2xl px-5 py-2.5 text-xs font-semibold cursor-pointer flex-1 transition-all"
              onClick={() => setActiveTab("used")}
            >
              {t("credit.viewUsageHistory")}
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-primary/10 cursor-pointer flex-1"
              onClick={() => setIsRechargeOpen(true)}
            >
              {t("credit.rechargeNow")}
            </Button>
          </div>
        </div>

        {/* Info stats */}
        <div className="flex flex-col gap-4">
          <CardUI className="border border-border/20 bg-card/20 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <WalletMoney weight="BoldDuotone" className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("credit.totalRecharged")}</p>
                <div className="mt-0.5">
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 bg-zinc-800" />
                  ) : (
                    <p className="text-base font-bold text-foreground">
                      {`${totalRechargedVND.toLocaleString(numberLocale)} đ`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardUI>
          <CardUI className="border border-border/20 bg-card/20 backdrop-blur-md rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <Chart weight="BoldDuotone" className="w-6 h-6 text-orange-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("credit.used")}</p>
                <div className="mt-0.5">
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 bg-zinc-800" />
                  ) : (
                    <p className="text-base font-bold text-foreground">
                      {`${totalUsedCredits.toLocaleString(numberLocale)} Credits`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardUI>
        </div>
      </div>


      {/* Notice/FAQs */}
      <CardUI className="border border-border/20 bg-card/10 backdrop-blur-sm rounded-3xl p-5 flex items-start gap-4">
        <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">        
          <div className="flex items-center gap-2">
            <ShieldCheck weight="BoldDuotone" className="w-5 h-5 text-primary shrink-0" />
            <p className="font-bold text-foreground text-sm">{t("credit.notesTitle")}</p>
          </div>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>{t("credit.noteNoRefund")}</li>
            <li>{t("credit.noteRefund")}</li>
            <li>{t("credit.noteSupport")}</li>
          </ul>
        </div>
      </CardUI>


      <RechargeDrawer isOpen={isRechargeOpen} onOpenChange={setIsRechargeOpen} />
    </div>
  );
}
