"use client";

import Image from "next/image";
import logoSrc from "@/app/assets/logo.svg";
import { Spinner } from "@/app/components/ui/spinner";
import SilkBackground from "@/app/components/common/SilkBackground";

export default function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col items-center justify-center select-none overflow-hidden">
      <SilkBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo and Brand Name */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <Image
              src={logoSrc}
              alt="InterV Logo"
              width={48}
              height={48}
              className="brightness-0 invert object-contain"
              priority
            />
          </div>
          <span className="font-logo font-bold text-3xl tracking-tight text-white">
            InterV<span className="text-[var(--chart-1)]">.</span>
          </span>
        </div>

        {/* Spinner */}
        <Spinner className="size-6 text-[var(--chart-1)] animate-spin" />
      </div>
    </div>
  );
}
