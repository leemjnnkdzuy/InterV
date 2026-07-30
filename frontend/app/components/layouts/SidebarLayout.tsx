"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import AppSidebar from "@/app/components/common/AppSidebar";
import SilkBackground from "@/app/components/common/SilkBackground";
import { SidebarLayoutProps } from "@/app/types";


export default function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        {/* Full-viewport silk background — flows behind both the sidebar and the content */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <SilkBackground />
        </div>
        <AppSidebar variant="home" />
        <SidebarInset className="relative z-10 flex flex-col flex-1 bg-transparent">
          {/* Main Workspace content */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
