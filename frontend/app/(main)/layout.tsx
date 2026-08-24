"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/contexts/AuthContext";
import SidebarLayout from "@/app/components/layouts/SidebarLayout";
import NothingLayout from "@/app/components/layouts/NothingLayout";
import { roleHomePath } from "@/app/lib/RoleRouting";

export default function MainRouteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthContext();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      if (user?.role === "admin" || user?.role === "recruiter") {
        router.replace(roleHomePath(user.role));
      } else if (user?.role === "user" && user?.isOnboarded === false) {
        router.replace("/onboarding");
      }
    }
  }, [loading, router, user?.role, user?.isOnboarded, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NothingLayout>{children}</NothingLayout>;
  }

  if (user?.role === "admin" || user?.role === "recruiter") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-b-primary" />
      </div>
    );
  }

  if (user?.role === "user" && user?.isOnboarded === false) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-b-primary" />
      </div>
    );
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
