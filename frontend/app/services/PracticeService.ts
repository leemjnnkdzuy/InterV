import api from "@/app/lib/Client";
import type {
  PracticeCreatePayload,
  PracticeUpdatePayload,
} from "@/app/types/PracticeProjectPage";

export const practiceService = {
  // Get all practice sessions
  getAll: async () => {
    const response = await api.get("/practice");
    return response.data;
  },

  // Get a single practice session details by ID
  getById: async (id: string) => {
    const response = await api.get(`/practice/${id}`);
    return response.data;
  },

  // Create a new practice session
  create: async (data: PracticeCreatePayload) => {
    const response = await api.post("/practice", data);
    return response.data;
  },

  // Update a practice session
  update: async (id: string, data: PracticeUpdatePayload) => {
    const response = await api.put(`/practice/${id}`, data);
    return response.data;
  },

  // Delete a practice session
  delete: async (id: string) => {
    const response = await api.delete(`/practice/${id}`);
    return response.data;
  },
};
