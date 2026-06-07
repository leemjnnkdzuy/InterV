"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import AppSidebar from "@/app/components/common/AppSidebar";
import { SidebarLayoutProps } from "@/app/types";


export default function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar variant="home" />
        <SidebarInset className="flex flex-col flex-1">
          {/* Main Workspace content */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background/40">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
