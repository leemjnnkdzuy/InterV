"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck, UserRoundSearch } from "lucide-react";

import DashboardSidebar, {
  type DashboardScope,
} from "@/app/components/common/DashboardSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { useAuthContext } from "@/app/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  scope: DashboardScope;
}

const routeTitles: Array<{
  test: (pathname: string) => boolean;
  title: string;
}> = [
  {
    test: (pathname) => pathname === "/admin",
    title: "Tổng quan hệ thống",
  },
  {
    test: (pathname) => pathname.startsWith("/admin/users"),
    title: "Người dùng & phân quyền",
  },
  {
    test: (pathname) => pathname.startsWith("/admin/recruitment"),
    title: "Giám sát tuyển dụng",
  },
  {
    test: (pathname) => pathname.startsWith("/admin/audit"),
    title: "Nhật ký quản trị",
  },
  {
    test: (pathname) => pathname === "/recruiter",
    title: "Tổng quan tuyển dụng",
  },
  {
    test: (pathname) => pathname === "/recruiter/interviews/new",
    title: "Tạo cuộc phỏng vấn",
  },
  {
    test: (pathname) => pathname.startsWith("/recruiter/interviews/"),
    title: "Chi tiết cuộc phỏng vấn",
  },
  {
    test: (pathname) => pathname === "/recruiter/interviews",
    title: "Cuộc phỏng vấn",
  },
  {
    test: (pathname) => pathname.startsWith("/recruiter/candidates"),
    title: "Ứng viên",
  },
  {
    test: (pathname) => pathname.startsWith("/recruiter/schedule"),
    title: "Lịch tuyển dụng",
  },
  {
    test: (pathname) => pathname.startsWith("/recruiter/history"),
    title: "Lịch sử & kết quả",
  },
];

export default function DashboardLayout({
  children,
  scope,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuthContext();
  const title =
    routeTitles.find((route) => route.test(pathname))?.title ||
    (scope === "admin" ? "Quản trị hệ thống" : "Không gian tuyển dụng");

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <DashboardSidebar scope={scope} />
          <SidebarInset className="min-w-0 bg-background">
            <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur-md md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="size-9 shrink-0" />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-extrabold text-foreground md:text-lg">
                    {title}
                  </h1>
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">
                    {scope === "admin"
                      ? "InterV Control Center"
                      : "InterV Recruitment Workspace"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-9 items-center gap-2 rounded-md border border-border/70 bg-card px-3 sm:flex">
                  {scope === "admin" ? (
                    <ShieldCheck className="size-4 text-emerald-500" />
                  ) : (
                    <UserRoundSearch className="size-4 text-cyan-500" />
                  )}
                  <span className="max-w-36 truncate text-xs font-bold">
                    {user?.username || "InterV"}
                  </span>
                </div>
              </div>
            </header>
            <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6 xl:px-8">
              <div className="mx-auto w-full max-w-[1600px]">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
