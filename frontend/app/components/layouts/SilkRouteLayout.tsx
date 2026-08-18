import React from "react";
import SilkBackground from "@/app/components/common/SilkBackground";

export default function SilkRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SilkBackground />
      </div>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
