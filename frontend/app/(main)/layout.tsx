"use client";

import React from "react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import SidebarLayout from "@/app/components/layouts/SidebarLayout";
import NothingLayout from "@/app/components/layouts/NothingLayout";

export default function MainRouteLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext();

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

  return <SidebarLayout>{children}</SidebarLayout>;
}
