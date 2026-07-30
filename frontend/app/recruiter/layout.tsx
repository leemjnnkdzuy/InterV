import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import DashboardLayout from "@/app/components/layouts/DashboardLayout";
import { getCurrentUser } from "@/app/lib/Auth";
import { roleHomePath } from "@/app/lib/RoleRouting";

export default async function RecruiterRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/recruiter");
  }
  if (user.role !== "recruiter") {
    redirect(roleHomePath(user.role));
  }
  return <DashboardLayout scope="recruiter">{children}</DashboardLayout>;
}
