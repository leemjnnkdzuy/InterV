import api from "@/app/lib/Client";
import { SocialLink } from "@/app/contexts/AuthContext";
import type {
  EmailChangeResponse,
  PasswordChangeResponse,
  ProfileUser,
  UsernameChangeResponse,
  UsernameCheckResponse,
  UserProfileUpdateResponse,
  UserSessionsResponse,
  UserServiceResponse,
} from "@/app/types";

export const userService = {
  getProfileByUsername: async (username: string): Promise<ProfileUser> => {
    const response = await api.get(`/users/${username}`);
    if (response.data.success) {
      return response.data.user;
    }
    throw new Error(response.data.message || "Không thể lấy thông tin người dùng");
  },
  updateProfile: async (data: {
    dob?: Date | string;
    avatar?: string;
    socialLinks?: SocialLink[];
  }): Promise<UserProfileUpdateResponse> => {
    const response = await api.put("/users/update", data);
    return response.data;
  },
  getSessions: async (): Promise<UserSessionsResponse> => {
    const response = await api.get("/auth/sessions");
    return response.data;
  },
  revokeSession: async (sessionId: string): Promise<UserServiceResponse> => {
    const response = await api.delete("/auth/sessions", { data: { sessionId } });
    return response.data;
  },
  revokeAllSessions: async (): Promise<UserServiceResponse> => {
    const response = await api.delete("/auth/sessions", { data: { revokeAll: true } });
    return response.data;
  },
  checkUsername: async (username: string): Promise<UsernameCheckResponse> => {
    const response = await api.get(`/users/check-username?username=${encodeURIComponent(username)}`);
    return response.data;
  },
  changeUsername: async (data: { newUsername: string; password?: string }): Promise<UsernameChangeResponse> => {
    const response = await api.post("/users/change-username", data);
    return response.data;
  },
  changePassword: async (data: { oldPassword?: string; newPassword?: string }): Promise<PasswordChangeResponse> => {
    const response = await api.post("/users/change-password", data);
    return response.data;
  },
  changeEmail: async (data: { action: string; pin?: string; newEmail?: string }): Promise<EmailChangeResponse> => {
    const response = await api.post("/users/change-email", data);
    return response.data;
  },
};
