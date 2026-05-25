"use client";

import React, { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import SettingsSidebar from "@/app/components/common/SettingsSidebar";
import AccountSettingsPage from "@/app/pages/AccountSettingsPage";
import SecuritySettingsPage from "@/app/pages/SecuritySettingsPage";
import AppearanceSettingsPage from "@/app/pages/AppearanceSettingsPage";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("account");

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountSettingsPage />;
      case "security":
        return <SecuritySettingsPage />;
      case "appearance":
        return <AppearanceSettingsPage />;
      default:
        return <AccountSettingsPage />;
    }
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarInset className="flex flex-col flex-1">
            {/* Main Workspace content */}
            <main className="flex-1 p-6 lg:p-12 overflow-y-auto bg-background/40 flex justify-center">
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

