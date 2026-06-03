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
import { toast } from "sonner";
import AppLoadingScreen from "@/app/components/common/AppLoadingScreen";
import type { User, AuthContextType } from "@/app/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSessionRevoked = useCallback(() => {
    setUser(null);
    localStorage.removeItem("interv_auth_status");
    toast.warning("Phiên đăng nhập đã bị đăng xuất hoặc hết hạn.");
    router.push("/login");
  }, [router]);

  const fetchUser = useCallback(async () => {
    const hasAuth = localStorage.getItem("interv_auth_status");
    if (!hasAuth) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        setUser(null);
        localStorage.removeItem("interv_auth_status");
      }
    } catch (err: any) {
      if (err.response?.data?.sessionRevoked) {
        return;
      }
      setUser(null);
      localStorage.removeItem("interv_auth_status");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (identifier: string, password: string, rememberMe = false) => {
      try {
        const response = await api.post("/auth/login", {
          identifier,
          password,
          rememberMe,
        });

        if (response.data.success) {
          setUser(response.data.user || null);
          localStorage.setItem("interv_auth_status", "true");
          return { success: true };
        } else {
          return {
            success: false,
            message: response.data.message || "Đăng nhập thất bại",
          };
        }
      } catch (error: any) {
        return {
          success: false,
          message: error.response?.data?.message || "Đăng nhập thất bại",
        };
      }
    },
    []
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
    fetchUser();
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
