"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/Client";
import { getErrorMessage } from "@/app/lib/Utils";
import { toast } from "sonner";
import AppLoadingScreen from "@/app/components/common/AppLoadingScreen";
import { useLanguage } from "@/app/hooks/useLanguage";
import type { User, AuthContextType } from "@/app/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSessionRevoked = useCallback(() => {
    setUser(null);
    localStorage.removeItem("interv_auth_status");
    toast.warning(t("auth.sessionExpired"));
    router.push("/login");
  }, [router, t]);

  const fetchUser = useCallback(async () => {
    try {
      const requestCurrentUser = () =>
        fetch("/api/auth/me?soft=true", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

      let response = await requestCurrentUser();
      let data = await response.json();
      if (!data.success) {
        const refreshResponse = await fetch("/api/auth/refresh?soft=true", {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          response = await requestCurrentUser();
          data = await response.json();
        } else if (refreshData.sessionRevoked) {
          handleSessionRevoked();
          return;
        }
      }

      if (response.ok && data.success) {
        setUser(data.user);
        localStorage.setItem("interv_auth_status", "true");
      } else {
        setUser(null);
        localStorage.removeItem("interv_auth_status");
      }
    } catch {
      setUser(null);
      localStorage.removeItem("interv_auth_status");
    } finally {
      setLoading(false);
    }
  }, [handleSessionRevoked]);

  const login = useCallback(
    async (identifier: string, password: string, rememberMe = false) => {
      try {
        const response = await api.post("/auth/login", {
          identifier,
          password,
          rememberMe,
        });

        if (response.data.success) {
          const loggedInUser = response.data.user || null;
          setUser(loggedInUser);
          localStorage.setItem("interv_auth_status", "true");
          return { success: true, user: loggedInUser || undefined };
        } else {
          return {
            success: false,
            message: response.data.message || t("auth.loginFailed"),
          };
        }
      } catch (error: unknown) {
        return {
          success: false,
          message: getErrorMessage(error, t("auth.loginFailed")),
        };
      }
    },
    [t]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("interv_auth_status");
      router.push("/");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUser();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUser]);

  useEffect(() => {
    window.addEventListener("session-revoked", handleSessionRevoked);
    return () => {
      window.removeEventListener("session-revoked", handleSessionRevoked);
    };
  }, [handleSessionRevoked]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {loading ? <AppLoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
