"use client";

import { formatDate, getActionName } from "@/app/lib/Utils";

import { Card } from "@/app/components/ui/card";
import { CpuBolt } from "@solar-icons/react";
import type { UsedCreditPageProps } from "@/app/types";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function UsedCreditPage({ creditLogs, isLoading }: UsedCreditPageProps) {
  const { t } = useLanguage();
  const usageLogs = creditLogs.filter((log) => log.credits < 0);
  const getActionLabel = (action: string) => {
    const key = `creditActions.${action}`;
    const translated = t(key);
    return translated === key ? getActionName(action) : translated;
  };

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("credit.usageTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("credit.usageDescription")}
        </p>
      </div>

      <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl overflow-hidden shadow-lg p-1.5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/10 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">{t("credit.transactionId")}</th>
                <th className="px-6 py-4">{t("credit.serviceType")}</th>
                <th className="px-6 py-4">{t("credit.transactionDetail")}</th>
                <th className="px-6 py-4">{t("credit.time")}</th>
                <th className="px-6 py-4 text-right">{t("credit.change")}</th>
                <th className="px-6 py-4 text-center">{t("credit.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                    {t("credit.loadingUsageHistory")}
                  </td>
                </tr>
              ) : usageLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                    {t("credit.emptyUsageHistory")}
                  </td>
                </tr>
              ) : (
                usageLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4.5 font-mono text-xs text-muted-foreground">
                      {item.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <CpuBolt className="w-4 h-4 text-primary shrink-0" />
                        <span>{getActionLabel(item.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-muted-foreground text-xs">
                      {item.description || t("credit.noDetail")}
                    </td>
                    <td className="px-6 py-4.5 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className={`px-6 py-4.5 text-right font-bold ${
                      item.credits > 0 ? "text-green-500" : "text-foreground"
                    }`}>
                      {item.credits > 0 ? `+${item.credits}` : item.credits} Credits
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                        {t("credit.statusPaid")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
