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
};
