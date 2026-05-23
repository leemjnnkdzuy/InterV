"use client";

import { useAuthContext } from "@/app/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuth({ enabled = true }: { enabled?: boolean } = {}) {
  const context = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (enabled && !context.loading && !context.isAuthenticated) {
      router.push("/login");
    }
  }, [enabled, context.loading, context.isAuthenticated, router]);

  return context;
}
export default useAuth;
