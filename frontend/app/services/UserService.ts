import api from "@/app/lib/Client";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  dob?: string;
  createdAt: string;
}

export const userService = {
  getProfileByUsername: async (username: string): Promise<UserProfile> => {
    const response = await api.get(`/users/${username}`);
    if (response.data.success) {
      return response.data.user;
    }
    throw new Error(response.data.message || "Không thể lấy thông tin người dùng");
  },
  updateProfile: async (data: { dob?: Date | string }): Promise<any> => {
    const response = await api.put("/users/update", data);
    return response.data;
  },
  getSessions: async (): Promise<any> => {
    const response = await api.get("/auth/sessions");
    return response.data;
  },
  revokeSession: async (sessionId: string): Promise<any> => {
    const response = await api.delete("/auth/sessions", { data: { sessionId } });
    return response.data;
  },
  revokeAllSessions: async (): Promise<any> => {
    const response = await api.delete("/auth/sessions", { data: { revokeAll: true } });
    return response.data;
  },
  checkUsername: async (username: string): Promise<any> => {
    const response = await api.get(`/users/check-username?username=${encodeURIComponent(username)}`);
    return response.data;
  },
  changeUsername: async (data: { newUsername: string; password?: string }): Promise<any> => {
    const response = await api.post("/users/change-username", data);
    return response.data;
  },
  changePassword: async (data: { oldPassword?: string; newPassword?: string }): Promise<any> => {
    const response = await api.post("/users/change-password", data);
    return response.data;
  },
  changeEmail: async (data: { action: string; pin?: string; newEmail?: string }): Promise<any> => {
    const response = await api.post("/users/change-email", data);
    return response.data;
  },
};
