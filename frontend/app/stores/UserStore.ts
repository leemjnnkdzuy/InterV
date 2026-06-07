import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";
import api from "@/app/lib/Client";
import { UserStore } from "@/app/types";
import { USER_STORAGE_KEY } from "@/app/contants";

export const useUserStore = create<UserStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        user: null,
        loading: false,
        isAuthenticated: false,

        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setLoading: (loading) => set({ loading }),
        clearUser: () => set({ user: null, isAuthenticated: false }),

        fetchUserMe: async () => {
          set({ loading: true });
          try {
            const response = await api.get("/auth/me");
            if (response.data.success) {
              set({ user: response.data.user, isAuthenticated: true });
            } else {
              set({ user: null, isAuthenticated: false });
            }
          } catch {
            set({ user: null, isAuthenticated: false });
          } finally {
            set({ loading: false });
          }
        },
      }),
      {
        name: USER_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
);
