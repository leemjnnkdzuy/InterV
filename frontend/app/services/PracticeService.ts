import api from "@/app/lib/Client";
import type {
  PracticeCreatePayload,
  PracticeQuotePayload,
  PracticeStartPayload,
  PracticeStartResponse,
  PracticeUpdatePayload,
} from "@/app/types";

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

  quote: async (id: string, data: PracticeQuotePayload) => {
    const response = await api.post(`/practice/${id}/quote`, data);
    return response.data;
  },

  startInterview: async (
    id: string,
    data: PracticeStartPayload
  ): Promise<PracticeStartResponse> => {
    const response = await api.post(`/practice/${id}/start`, data);
    return response.data;
  },

  finishInterview: async (
    runId: string,
    data: {
      practiceId: string;
      title: string;
      industry: string;
      difficulty: string;
      language: string;
      jobDescription: string;
      topic: string;
      questionsList: string[];
      qaHistory: Array<{ question: string; answer: string }>;
      duration: string;
    }
  ) => {
    const response = await api.post(`/ai/interview/${runId}/finish`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/practice/${id}`);
    return response.data;
  },
};
