"use client";

import { formatCurrency, formatDate } from "@/app/lib/Utils";
import { Card } from "@/app/components/ui/card";
import type { RechargeCreditPageProps } from "@/app/types";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function RechargeCreditPage({ transactions, isLoading }: RechargeCreditPageProps) {
  const { language, t } = useLanguage();
  const numberLocale = language === "zh" ? "zh-CN" : language === "en" ? "en-US" : "vi-VN";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            {t("credit.statusPaid")}
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-500 border border-amber-500/10">
            {t("credit.statusPending")}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-500 border border-red-500/10">
            {t("credit.statusCancelled")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-muted/10 text-muted border border-muted/10">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("credit.rechargeHistoryTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("credit.rechargeHistoryDescription")}
        </p>
      </div>

      {/* Recharge History Table */}
      <div className="space-y-4">
        <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl overflow-hidden shadow-lg p-1.5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/10 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">{t("credit.orderCode")}</th>
                  <th className="px-6 py-4">{t("credit.method")}</th>
                  <th className="px-6 py-4">{t("credit.rechargeTime")}</th>
                  <th className="px-6 py-4 text-right">{t("credit.amount")}</th>
                  <th className="px-6 py-4 text-right">{t("credit.receivedCredits")}</th>
                  <th className="px-6 py-4 text-center">{t("credit.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                      {t("credit.loadingRechargeHistory")}
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                      {t("credit.emptyRechargeHistory")}
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        #{item.orderCode}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {item.amount === 0 ? t("credit.systemGift") : t("credit.payosPayment")}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground text-xs">
                        {item.amount === 0 ? t("credit.free") : formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-500">
                        +{item.credits.toLocaleString(numberLocale)} Credits
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
