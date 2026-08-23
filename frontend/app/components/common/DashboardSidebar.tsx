"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AltArrowRight as ChevronRight,
  Bag,
  CalendarDate,
  ChartSquare,
  CodeScan,
  FileText,
  History,
  Logout as LogOut,
  MenuDots,
  Playlist,
  RoundGraph,
  ShieldCheck,
  User,
  UsersGroupRounded,
  WalletMoney,
} from "@solar-icons/react";

import { logo } from "@/app/assets";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    subtitle: "Control Center",
    href: "/admin",
    icon: ChartSquare,
    exact: true,
  },
  {
    label: "Người dùng & quyền",
    subtitle: "Tài khoản & vai trò",
    href: "/admin/users",
    icon: User,
  },
  {
    label: "Hoạt động tuyển dụng",
    subtitle: "Chiến dịch & ứng viên",
    href: "/admin/recruitment",
    icon: Bag,
  },
  {
    label: "DeepSeek & AI",
    subtitle: "Model, credit, sử dụng",
    href: "/admin/ai",
    icon: CodeScan,
  },
  {
    label: "Thanh toán & credit",
    subtitle: "Nạp tiền & giao dịch",
    href: "/admin/payments",
    icon: WalletMoney,
  },
  {
    label: "Nhật ký API",
    subtitle: "Request & hiệu năng",
    href: "/admin/api-logs",
    icon: FileText,
  },
  {
    label: "Nhật ký quản trị",
    subtitle: "Audit trail",
    href: "/admin/audit",
    icon: ShieldCheck,
  },
] as const;

const recruiterItems = [
  {
    label: "Tổng quan",
    subtitle: "Workspace",
    href: "/recruiter",
    icon: ChartSquare,
    exact: true,
  },
  {
    label: "Tạo cuộc phỏng vấn",
    subtitle: "JD & câu hỏi",
    href: "/recruiter/interviews/new",
    icon: RoundGraph,
    exact: true,
  },
  {
    label: "Cuộc phỏng vấn",
    subtitle: "Chiến dịch",
    href: "/recruiter/interviews",
    icon: Playlist,
    exact: true,
  },
  {
    label: "Ứng viên",
    subtitle: "Hồ sơ & kết quả",
    href: "/recruiter/candidates",
    icon: UsersGroupRounded,
  },
  {
    label: "Lịch tuyển dụng",
    subtitle: "Lịch hẹn",
    href: "/recruiter/schedule",
    icon: CalendarDate,
  },
  {
    label: "Lịch sử & kết quả",
    subtitle: "Đánh giá",
    href: "/recruiter/history",
    icon: History,
  },
] as const;

const menuVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: -6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 22,
    },
  },
} as const;

export default function DashboardSidebar({
  scope,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setOpenMobile } = useSidebar();
  const { user, logout } = useAuthContext();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const collapsed = state === "collapsed";
  const items = scope === "admin" ? adminItems : recruiterItems;
  const roleLabel = scope === "admin" ? "Quản trị hệ thống" : "Nhà tuyển dụng";

  const navigate = (href: string) => {
    router.push(href);
    setOpenMobile(false);
  };

  const openLogoutConfirm = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setShowLogoutConfirm(false);
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-none bg-transparent transition-all duration-300 [&_[data-slot=sidebar-inner]]:border-e [&_[data-slot=sidebar-inner]]:border-white/10 [&_[data-slot=sidebar-inner]]:bg-sidebar/65 [&_[data-slot=sidebar-inner]]:backdrop-blur-xl [&_[data-slot=sidebar-inner]]:shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
    >
      <SidebarHeader className="border-b-0 flex h-20 flex-row items-center justify-between px-6 group-data-[collapsible=icon]:h-28 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:px-0">
        {collapsed ? (
          <>
            <button
              type="button"
              onClick={() => navigate(scope === "admin" ? "/admin" : "/recruiter")}
              className="relative flex size-9 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Mở ${roleLabel}`}
            >
              <Image
                src={logo}
                alt=""
                width={36}
                height={36}
                className="size-9 object-contain invert dark:invert-0"
                priority
              />
            </button>
            <SidebarTrigger className="size-9 shrink-0 text-muted-foreground transition-colors hover:text-foreground" />
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(scope === "admin" ? "/admin" : "/recruiter")}
            className="flex min-w-0 items-center gap-2.5 rounded-md p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Mở ${roleLabel}`}
          >
            <Image
              src={logo}
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 object-contain invert dark:invert-0"
              priority
            />
            {!collapsed && (
              <span className="min-w-0">
                <span className="font-logo block truncate text-2xl font-bold tracking-normal text-foreground">
                  InterV<span className="text-primary">.</span>
                </span>
              </span>
            )}
          </button>
          <div className="flex items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent/50">
            <SidebarTrigger className="size-9 shrink-0 text-muted-foreground transition-colors hover:text-foreground" />
          </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="no-scrollbar px-3 py-6">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              <motion.div
                key={scope}
                variants={menuVariants}
                initial="hidden"
                animate="show"
                className="flex w-full flex-col gap-2"
              >
              {items.map((item) => {
                const active = "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <motion.div variants={itemVariants} className="w-full">
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={active}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "relative flex w-full cursor-pointer items-center overflow-hidden transition-all duration-300 group/btn",
                        collapsed
                          ? "mx-auto justify-center rounded-full group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!p-2.5"
                          : "h-auto gap-4 rounded-full px-5 py-3 text-sm font-medium",
                        active
                          ? "text-background shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                      )}
                    >
                      {active && (
                        <motion.div
                          initial={{ x: "-100%" }}
                          animate={{ x: 0 }}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          className="absolute inset-0 z-0 rounded-full bg-primary"
                        />
                      )}
                      <div className={cn("relative z-10 flex w-full items-center", collapsed ? "justify-center" : "gap-3")}>
                        <item.icon
                          weight="BoldDuotone"
                          className={cn(
                            "!h-8 !w-8 shrink-0 transition-all duration-300",
                            active
                              ? "text-background"
                              : "text-muted-foreground group-hover/btn:text-foreground"
                          )}
                        />
                        <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden py-0.5">
                          <span
                            className={cn(
                              "block truncate text-sm font-bold leading-snug py-0.5 tracking-normal",
                              active ? "text-background" : "text-foreground"
                            )}
                          >
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block truncate text-[10px] font-medium leading-snug py-0.5 tracking-normal",
                              active ? "text-background/70" : "text-muted-foreground/80"
                            )}
                          >
                            {item.subtitle}
                          </span>
                        </div>
                      {!collapsed && active && (
                          <ChevronRight weight="BoldDuotone" className="size-4 shrink-0 text-background" />
                      )}
                      </div>
                    </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
              </motion.div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t-0 bg-gradient-to-t from-sidebar-accent/10 to-transparent p-4">
        {user && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-border/20 bg-card/40 p-3 shadow-sm backdrop-blur-md transition-all duration-300",
              collapsed && "justify-center border-transparent bg-transparent p-0"
            )}
          >
            <div className={cn(
              "relative shrink-0 rounded-xl bg-gradient-to-tr from-primary/30 to-primary-foreground/30 p-0.5 shadow-inner",
              collapsed ? "size-12" : "size-10"
            )}>
              <div className="relative flex size-full items-center justify-center overflow-hidden rounded-[10px] border border-border/20 bg-sidebar-accent text-sm font-extrabold text-sidebar-accent-foreground shadow-inner">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                user.username.slice(0, 1).toUpperCase()
              )}
              </div>
              {!collapsed && (
                <span className="absolute bottom-[-1px] right-[-1px] size-3 rounded-full border-2 border-background bg-emerald-500" />
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
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Tùy chọn tài khoản"
                      aria-label="Tùy chọn tài khoản"
                      className="cursor-pointer rounded-xl border border-transparent p-2 text-muted-foreground transition-all duration-300 hover:border-border/20 hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <MenuDots className="size-5 rotate-90" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-3xl border border-border/10 bg-card p-1.5 shadow-lg"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate("/profile")}
                      className="cursor-pointer"
                    >
                      <User weight="BoldDuotone" className="mr-2 size-4" />
                      <span>Tài khoản</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={openLogoutConfirm}
                      className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20"
                    >
                      <LogOut weight="BoldDuotone" className="mr-2 size-4 text-destructive" />
                      <span>Đăng xuất</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </SidebarFooter>

      <Dialog
        open={showLogoutConfirm}
        onOpenChange={(open) => {
          if (!isLoggingOut) {
            setShowLogoutConfirm(open);
          }
        }}
      >
        <DialogContent className="rounded-lg border-border/20 bg-card/95 sm:max-w-[380px]" showCloseButton={false}>
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-lg font-extrabold tracking-normal text-foreground">
              Xác nhận đăng xuất
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              Bạn có chắc muốn đăng xuất khỏi phiên hiện tại không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-1 flex-row gap-3 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 rounded-lg"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoggingOut}
              onClick={() => void confirmLogout()}
              className="flex-1 rounded-lg font-bold"
            >
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
