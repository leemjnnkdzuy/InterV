import { User } from "./Auth";

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
