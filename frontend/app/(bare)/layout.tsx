import React from "react";
import NothingLayout from "@/app/components/layouts/NothingLayout";

export default function BareRouteLayout({ children }: { children: React.ReactNode }) {
  return <NothingLayout>{children}</NothingLayout>;
}
