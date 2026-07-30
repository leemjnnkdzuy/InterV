"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import AppSidebar from "@/app/components/common/AppSidebar";
import CreditPage from "@/app/pages/CreditPage";
import UsedCreditPage from "@/app/pages/UsedCreditPage";
import RechargeCreditPage from "@/app/pages/RechargeCreditPage";
import api from "@/app/lib/Client";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/app/hooks/useLanguage";
import type { CreditHistoryResponse, CreditLogItem, CreditTransactionItem } from "@/app/types";

export default function CreditPageRoute() {
  const { refreshUser } = useAuthContext();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("balance");
  const [creditLogs, setCreditLogs] = useState<CreditLogItem[]>([]);
  const [transactions, setTransactions] = useState<CreditTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<CreditHistoryResponse>("/users/credit-history");
      if (response.data.success) {
        setCreditLogs(response.data.creditLogs || []);
        setTransactions(response.data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching credit history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchHistory();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchHistory]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const orderCode = params.get("orderCode");

      if (status === "success" && orderCode) {
        const verifyPayment = async () => {
          try {
            toast.loading(t("credit.verifyingPayment"), { id: "verify-payment" });
            const response = await api.post("/payment/verify", {
              orderCode: Number(orderCode),
            });
            if (response.data.success && response.data.status === "PAID") {
              toast.success(t("credit.paymentSuccess"), {
                id: "verify-payment",
              });
              await refreshUser();
              fetchHistory();
            } else {
              toast.error(t("credit.paymentVerifyFailed"), {
                id: "verify-payment",
              });
            }
          } catch {
            toast.error(t("credit.paymentVerifyError"), { id: "verify-payment" });
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };
        verifyPayment();
      } else if (status === "cancel") {
        toast.error(t("credit.paymentCancelled"));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [fetchHistory, refreshUser, t]);

  const renderContent = () => {
    switch (activeTab) {
      case "balance":
        return (
          <CreditPage
            setActiveTab={setActiveTab}
            creditLogs={creditLogs}
            transactions={transactions}
            isLoading={isLoading}
          />
        );
      case "used":
        return (
          <UsedCreditPage
            setActiveTab={setActiveTab}
            creditLogs={creditLogs}
            isLoading={isLoading}
          />
        );
      case "recharge":
        return (
          <RechargeCreditPage
            setActiveTab={setActiveTab}
            transactions={transactions}
            isLoading={isLoading}
          />
        );
      default:
        return (
          <CreditPage
            setActiveTab={setActiveTab}
            creditLogs={creditLogs}
            transactions={transactions}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar variant="credit" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarInset className="flex flex-col flex-1">
            {/* Main Workspace content */}
            <main className="flex-1 p-6 lg:p-12 overflow-y-auto bg-background/40 flex justify-center text-left">
              <div className="w-full max-w-4xl">
                {renderContent()}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
