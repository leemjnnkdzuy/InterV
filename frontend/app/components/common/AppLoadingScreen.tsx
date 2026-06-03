"use client";

import Image from "next/image";
import logoSrc from "@/app/assets/logo.svg";
import { Spinner } from "@/app/components/ui/spinner";

export default function AppLoadingScreen() {
  return (
    <div className="dark fixed inset-0 z-50 bg-zinc-950 text-white flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Background Ambient Glow (Mesh Gradient Effect matching LoginPage) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        {/* Soft Gold/Orange/Lime glow in top-left using chart-1 */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[var(--chart-1)]/15 blur-[130px]" />

        {/* Soft Violet/Purple glow in the center-top */}
        <div className="absolute -top-60 left-[20%] w-[900px] h-[900px] rounded-full bg-[oklch(0.48_0.18_290)]/20 blur-[160px]" />

        {/* Soft Pink/Magenta ambient glow on the right-middle side */}
        <div className="absolute top-[20%] -right-40 w-[550px] h-[550px] rounded-full bg-[oklch(0.55_0.2_315)]/15 blur-[120px]" />

        {/* Soft Green base ambient glow towards bottom-left using chart-3 */}
        <div className="absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-[var(--chart-3)]/10 blur-[150px]" />
      </div>

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
