import axios from "axios";
import api from "@/app/lib/Client";
import type {
  InterviewResultResponse,
  PracticeCreatePayload,
  PracticeQuotePayload,
  PracticeStartPayload,
  PracticeStartResponse,
  PracticeUpdatePayload,
} from "@/app/types";

const START_RECOVERY_TIMEOUT_MS = 380_000;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

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
    const deadline = Date.now() + START_RECOVERY_TIMEOUT_MS;
    let networkRetries = 0;
    while (true) {
      try {
        const remaining = Math.max(10_000, deadline - Date.now());
        const response = await api.post(`/practice/${id}/start`, data, {
          timeout: Math.min(360_000, remaining),
        });
        return response.data;
      } catch (error: unknown) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const responseData = error.response?.data as
          | { preparing?: boolean; retryAfterSeconds?: number }
          | undefined;
        if (
          error.response?.status === 409 &&
          responseData?.preparing === true &&
          Date.now() < deadline
        ) {
          const retrySeconds = Math.max(
            1,
            Math.min(5, Number(responseData.retryAfterSeconds) || 3)
          );
          await wait(retrySeconds * 1000);
          continue;
        }
        if (
          !error.response &&
          networkRetries < 2 &&
          Date.now() + 2000 < deadline
        ) {
          networkRetries += 1;
          await wait(2000);
          continue;
        }
        throw error;
      }
    }
  },

  finishInterview: async (
    runId: string,
    data: {
      practiceId: string;
      duration: string;
    }
  ) => {
    const response = await api.post(`/ai/interview/${runId}/finish`, data, {
      timeout: 600_000,
    });
    return response.data;
  },

  getInterviewResult: async (
    runId: string
  ): Promise<InterviewResultResponse> => {
    const response = await api.get(`/ai/interview/${runId}/result`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/practice/${id}`);
    return response.data;
  },
};
