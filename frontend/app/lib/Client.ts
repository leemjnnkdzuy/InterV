import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}

interface SessionRevokedResponse {
  sessionRevoked?: boolean;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(null);
    }
  });
  failedQueue = [];
};

export const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      const responseData = error.response?.data as SessionRevokedResponse;
      if (responseData?.sessionRevoked) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("session-revoked"));
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        const axiosErr = refreshError as AxiosError;
        if (
          axiosErr?.response?.status === 401 ||
          (axiosErr?.response?.data as SessionRevokedResponse)?.sessionRevoked
        ) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("session-revoked"));
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
