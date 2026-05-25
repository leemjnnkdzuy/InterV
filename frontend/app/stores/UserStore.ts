import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";
import api from "@/app/lib/Client";

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export interface UserState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface UserActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
  fetchUserMe: () => Promise<void>;
}

export type UserStore = UserState & UserActions;

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
          } catch (error) {
            set({ user: null, isAuthenticated: false });
          } finally {
            set({ loading: false });
          }
        },
      }),
      {
        name: "interv-user-storage",
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
);
