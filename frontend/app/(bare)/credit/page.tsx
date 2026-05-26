"use client";

import React, { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import CreditSidebar from "@/app/components/common/CreditSidebar";
import CreditPage from "@/app/pages/CreditPage";
import UsedCreditPage from "@/app/pages/UsedCreditPage";
import RechargeCreditPage from "@/app/pages/RechargeCreditPage";

export default function CreditPageRoute() {
  const [activeTab, setActiveTab] = useState<string>("balance");

  const renderContent = () => {
    switch (activeTab) {
      case "balance":
        return <CreditPage setActiveTab={setActiveTab} />;
      case "used":
        return <UsedCreditPage setActiveTab={setActiveTab} />;
      case "recharge":
        return <RechargeCreditPage setActiveTab={setActiveTab} />;
      default:
        return <CreditPage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <CreditSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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
