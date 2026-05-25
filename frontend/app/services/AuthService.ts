import api from "@/app/lib/Client";

export const authService = {
  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
  login: async (identifier: string, password: string, rememberMe = false) => {
    const response = await api.post("/auth/login", {
      identifier,
      password,
      rememberMe,
    });
    return response.data;
  },
  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },
  refresh: async () => {
    const response = await api.post("/auth/refresh");
    return response.data;
  },
  register: async (username: string, email: string, password: string) => {
    const response = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    return response.data;
  },
  resetPassword: async (email: string) => {
    const response = await api.post("/auth/reset-password", { email });
    return response.data;
  },
};
