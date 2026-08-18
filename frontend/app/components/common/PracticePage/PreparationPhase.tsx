"use client";

import Image from "next/image";

import logoSrc from "@/app/assets/logo.svg";
import { Spinner } from "@/app/components/ui/spinner";

export default function PreparationPhase() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 text-center text-foreground">
      <div className="flex animate-in fade-in zoom-in-95 flex-col items-center duration-500">
        <Image
          src={logoSrc}
          alt="InterV"
          width={96}
          height={96}
          className="h-24 w-24 object-contain invert dark:invert-0"
          priority
        />
        <Spinner className="mt-8 h-5 w-5 text-primary" />
      </div>
    </div>
  );
}
