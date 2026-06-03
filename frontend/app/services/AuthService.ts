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
  sendRegisterPin: async (username: string, email: string, password: string) => {
    const response = await api.post("/auth/register", {
      action: "send-pin",
      username,
      email,
      password,
    });
    return response.data;
  },
  verifyRegisterPin: async (email: string, pin: string) => {
    const response = await api.post("/auth/register", {
      action: "verify-pin",
      email,
      pin,
    });
    return response.data;
  },

  sendResetPin: async (email: string) => {
    const response = await api.post("/auth/reset-password", {
      action: "send-pin",
      email,
    });
    return response.data;
  },
  verifyResetPin: async (email: string, pin: string) => {
    const response = await api.post("/auth/reset-password", {
      action: "verify-pin",
      email,
      pin,
    });
    return response.data;
  },
  resetPassword: async (email: string, newPassword: string) => {
    const response = await api.post("/auth/reset-password", {
      action: "reset-password",
      email,
      newPassword,
    });
    return response.data;
  },
};

