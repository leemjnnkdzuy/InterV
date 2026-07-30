import type { AppRole } from "./User";

export interface TokenPayload {
  userId: string;
  sessionId?: string;
  tokenType: "access" | "refresh";
  rememberMe?: boolean;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface SocialLink {
  platform: string;
  usernameOrUrl: string;
}


export interface User {
  id: string;
  username: string;
  email: string;
  role: AppRole;
  avatar?: string;
  dob?: string;
  socialLinks?: SocialLink[];
  credits: number;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    identifier: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
