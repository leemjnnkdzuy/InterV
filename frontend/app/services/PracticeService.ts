import api from "@/app/lib/Client";
import type {
  PracticeCreatePayload,
  PracticeUpdatePayload,
} from "@/app/types/PracticeProjectPage";

export const practiceService = {
  getAll: async () => {
    const response = await api.get("/practice");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/practice/${id}`);
    return response.data;
  },

  create: async (data: PracticeCreatePayload) => {
    const response = await api.post("/practice", data);
    return response.data;
  },

  update: async (id: string, data: PracticeUpdatePayload) => {
    const response = await api.put(`/practice/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/practice/${id}`);
    return response.data;
  },
};
