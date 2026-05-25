"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { logo } from "@/app/assets";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/app/components/ui/sidebar";
import {
  LayoutDashboard,
  PlayCircle,
  History,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/Utils";

export default function HomeSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    {
      title: "Bảng điều khiển",
      subtitle: "Tổng quan tiến độ",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Luyện phỏng vấn",
      subtitle: "Giả lập AI thực tế",
      url: "/practice",
      icon: PlayCircle,
    },
    {
      title: "Lịch sử luyện tập",
      subtitle: "Kết quả & Đánh giá",
      url: "/history",
      icon: History,
    },
    {
      title: "Cài đặt tài khoản",
      subtitle: "Tùy chỉnh hệ thống",
      url: "/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar className="bg-sidebar border-none border-e-0 transition-all duration-300" collapsible="icon">
      {/* Sidebar Header */}
      <SidebarHeader className="flex h-20 flex-row items-center justify-between px-6 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-28">
        {isCollapsed ? (
          <>
            <div 
              onClick={() => router.push("/")} 
              className="relative w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Image
                src={logo}
                alt="InterV Logo"
                width={36}
                height={36}
                className="invert dark:invert-0 object-contain"
                priority
              />
            </div>
            <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors" />
          </>
        ) : (
          <>
            <div 
              onClick={() => router.push("/")} 
              className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="relative w-9 h-9 flex items-center justify-center">
                <Image
                  src={logo}
                  alt="InterV Logo"
                  width={36}
                  height={36}
                  className="invert dark:invert-0 object-contain"
                  priority
                />
              </div>
              <span className="font-logo text-2xl font-bold tracking-tight text-foreground">
                InterV<span className="text-[var(--chart-1)]">.</span>
              </span>
            </div>
            <div className="flex items-center justify-center rounded-xl hover:bg-sidebar-accent/50 transition-colors">
              <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors" />
            </div>
          </>
        )}
      </SidebarHeader>

      <SidebarSeparator className="bg-border/20 mx-4" />

      {/* Sidebar Content */}
      <SidebarContent className="px-3 py-6 no-scrollbar">
        <SidebarMenu className="gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  onClick={() => router.push(item.url)}
                  className={cn(
                    "relative flex w-full items-center transition-all duration-300 group/btn overflow-hidden cursor-pointer",
                    isCollapsed 
                      ? "justify-center p-2.5 rounded-2xl h-12 w-12 mx-auto" 
                      : "gap-4 rounded-2xl px-4 py-3 h-auto text-sm font-medium",
                    isActive
                      ? "text-background shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  {/* Active Background Slide Animation */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-primary z-0 rounded-2xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Menu Item Content */}
                  <div className={cn("relative z-10 flex items-center w-full", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className={cn(
                      "transition-all duration-300",
                      isCollapsed 
                        ? "text-current" 
                        : cn(
                            "p-1.5 rounded-xl border",
                            isActive
                              ? "bg-background/10 border-background/20 text-background"
                              : "bg-muted border-border/20 text-muted-foreground group-hover/btn:border-foreground/20 group-hover/btn:text-foreground"
                          )
                    )}>
                      <item.icon className={cn("shrink-0", isCollapsed ? "h-6 w-6" : "h-5 w-5")} />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                      <span className={cn(
                        "truncate text-sm font-semibold tracking-tight leading-none",
                        isActive ? "text-background" : "text-foreground"
                      )}>
                        {item.title}
                      </span>
                      <span className={cn(
                        "truncate text-[10px] font-normal leading-normal mt-0.5",
                        isActive ? "text-background/70" : "text-muted-foreground/80"
                      )}>
                        {item.subtitle}
                      </span>
                    </div>

                    {!isCollapsed && (
                      <ChevronRight className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-300 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5",
                        isActive ? "text-background" : "text-muted-foreground"
                      )} />
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator className="bg-border/20 mx-4" />

      {/* Sidebar Footer */}
      <SidebarFooter className="p-4 bg-gradient-to-t from-sidebar-accent/10 to-transparent">
        <SidebarMenu className="gap-3">
          {user && (
            <SidebarMenuItem>
              <div 
                className={cn(
                  "flex items-center transition-all duration-300",
                  isCollapsed 
                    ? "justify-center p-0 bg-transparent border-transparent cursor-pointer group/user" 
                    : "gap-3 px-3 py-3 rounded-2xl border border-border/20 bg-card/40 backdrop-blur-md shadow-sm"
                )}
                onClick={isCollapsed ? () => logout() : undefined}
                title={isCollapsed ? "Đăng xuất" : undefined}
              >
                {/* Avatar with Glow ring */}
                <div className={cn(
                  "relative shrink-0 rounded-xl bg-gradient-to-tr from-primary/30 to-primary-foreground/30 shadow-inner transition-all duration-300",
                  isCollapsed ? "h-12 w-12 p-0.5 group-hover/user:from-destructive/30 group-hover/user:to-destructive/30" : "h-10 w-10 p-0.5"
                )}>
                  <div className="w-full h-full rounded-[10px] bg-sidebar-accent text-sidebar-accent-foreground font-semibold flex items-center justify-center border border-border/20 overflow-hidden shadow-inner relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className={cn("h-full w-full object-cover transition-opacity duration-300", isCollapsed && "group-hover/user:opacity-0")}
                      />
                    ) : user.username ? (
                      <span className={cn("transition-opacity duration-300", isCollapsed && "group-hover/user:opacity-0")}>
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <UserIcon className={cn("transition-opacity duration-300", isCollapsed ? "h-6 w-6 group-hover/user:opacity-0" : "h-5 w-5")} />
                    )}

                    {/* LogOut icon overlay when collapsed and hovered */}
                    {isCollapsed && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/user:opacity-100 transition-opacity duration-300 text-destructive">
                        <LogOut className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  {/* Active dot */}
                  {!isCollapsed && (
                    <span className="absolute bottom-[-1px] right-[-1px] h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse"></span>
                  )}
                </div>

                {/* Profile text */}
                <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-bold text-foreground leading-none flex items-center gap-1.5">
                    {user.username}
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
                      Ứng viên
                    </span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground mt-1">
                    {user.email}
                  </span>
                </div>

                {/* Logout button on the right when expanded */}
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                    title="Đăng xuất"
                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all duration-300 cursor-pointer"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
