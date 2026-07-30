"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  History,
  LogOut,
  Plus,
  ShieldCheck,
  WalletCards,
  UserRoundCog,
  Users,
} from "lucide-react";

import { logo } from "@/app/assets";
import { Button } from "@/app/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/app/components/ui/sidebar";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { cn } from "@/app/lib/Utils";

export type DashboardScope = "admin" | "recruiter";

interface DashboardSidebarProps {
  scope: DashboardScope;
}

const adminItems = [
  {
    label: "Tổng quan",
    href: "/admin",
    icon: BarChart3,
    exact: true,
  },
  {
    label: "Người dùng & quyền",
    href: "/admin/users",
    icon: UserRoundCog,
  },
  {
    label: "Hoạt động tuyển dụng",
    href: "/admin/recruitment",
    icon: BriefcaseBusiness,
  },
  {
    label: "DeepSeek & AI",
    href: "/admin/ai",
    icon: Bot,
  },
  {
    label: "Thanh toán & credit",
    href: "/admin/payments",
    icon: WalletCards,
  },
  {
    label: "Nhật ký quản trị",
    href: "/admin/audit",
    icon: ShieldCheck,
  },
] as const;

const recruiterItems = [
  {
    label: "Tổng quan",
    href: "/recruiter",
    icon: BarChart3,
    exact: true,
  },
  {
    label: "Tạo cuộc phỏng vấn",
    href: "/recruiter/interviews/new",
    icon: Plus,
    exact: true,
  },
  {
    label: "Cuộc phỏng vấn",
    href: "/recruiter/interviews",
    icon: ClipboardList,
    exact: true,
  },
  {
    label: "Ứng viên",
    href: "/recruiter/candidates",
    icon: Users,
  },
  {
    label: "Lịch tuyển dụng",
    href: "/recruiter/schedule",
    icon: CalendarDays,
  },
  {
    label: "Lịch sử & kết quả",
    href: "/recruiter/history",
    icon: History,
  },
] as const;

export default function DashboardSidebar({
  scope,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setOpenMobile } = useSidebar();
  const { user, logout } = useAuthContext();
  const collapsed = state === "collapsed";
  const items = scope === "admin" ? adminItems : recruiterItems;
  const roleLabel = scope === "admin" ? "Quản trị hệ thống" : "Nhà tuyển dụng";

  const navigate = (href: string) => {
    router.push(href);
    setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/70 bg-sidebar"
    >
      <SidebarHeader className="h-16 justify-center px-3">
        <div
          className={cn(
            "flex w-full items-center",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <button
            type="button"
            onClick={() => navigate(scope === "admin" ? "/admin" : "/recruiter")}
            className="flex min-w-0 items-center gap-2.5 rounded-md p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Mở ${roleLabel}`}
          >
            <Image
              src={logo}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 object-contain invert dark:invert-0"
              priority
            />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold text-foreground">
                  InterV<span className="text-primary">.</span>
                </span>
                <span className="block truncate text-[11px] font-medium text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
            )}
          </button>
          {!collapsed && <SidebarTrigger className="size-8 shrink-0" />}
        </div>
      </SidebarHeader>

      <SidebarSeparator className="mx-3 w-auto bg-border/70" />

      <SidebarContent>
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="mb-2 px-2 text-[11px] font-bold uppercase text-muted-foreground group-data-[collapsible=icon]:sr-only">
            Không gian làm việc
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={active}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "h-10 cursor-pointer rounded-md px-2.5 text-sm font-semibold",
                        active
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {!collapsed && active && (
                        <ChevronRight className="ml-auto size-4" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-3 w-auto bg-border/70" />

      <SidebarFooter className="p-2">
        {user && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2",
              collapsed && "justify-center border-transparent bg-transparent"
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/15 text-sm font-extrabold text-primary">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt=""
                  width={36}
                  height={36}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                user.username.slice(0, 1).toUpperCase()
              )}
            </div>
            {!collapsed && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-bold text-foreground">
                    {user.username}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  onClick={() => void logout()}
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="size-4" />
                </Button>
              </>
            )}
          </div>
        )}
        {collapsed && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Đăng xuất"
                onClick={() => void logout()}
                className="cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4.5" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
