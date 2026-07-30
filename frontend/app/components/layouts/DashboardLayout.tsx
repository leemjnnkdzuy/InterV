"use client";

import type { ReactNode } from "react";

import DashboardSidebar, {
  type DashboardScope,
} from "@/app/components/common/DashboardSidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import SilkBackground from "@/app/components/common/SilkBackground";

interface DashboardLayoutProps {
  children: ReactNode;
  scope: DashboardScope;
}

export default function DashboardLayout({
  children,
  scope,
}: DashboardLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <div className="relative flex min-h-screen w-full overflow-hidden bg-background text-foreground">
          <div className="fixed inset-0 z-0 pointer-events-none">
            <SilkBackground />
          </div>
          <DashboardSidebar scope={scope} />
          <SidebarInset className="relative z-10 min-w-0 bg-transparent">
            <main className="min-w-0 flex-1 px-5 py-8 md:px-10 lg:px-16 xl:px-20">
              <div className="mx-auto w-full max-w-[1600px]">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
