import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import DashboardLayout from "@/app/components/layouts/DashboardLayout";
import { getCurrentUser } from "@/app/lib/Auth";
import { roleHomePath } from "@/app/lib/RoleRouting";

export default async function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "admin") {
    redirect(roleHomePath(user.role));
  }
  return <DashboardLayout scope="admin">{children}</DashboardLayout>;
}
