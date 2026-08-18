import axios from "axios";
import api from "@/app/lib/Client";
import type {
  InterviewResultResponse,
  PracticeCreatePayload,
  PracticeHistoryResponse,
  PracticeHistorySource,
  PracticeOpeningPayload,
  PracticeOpeningResponse,
  PracticeQuotePayload,
  PracticeStartPayload,
  PracticeStartResponse,
  PracticeUpdatePayload,
} from "@/app/types";

const START_RECOVERY_TIMEOUT_MS = 380_000;
const FINISH_RECOVERY_TIMEOUT_MS = 600_000;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function createRecoveryIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    let idempotencyReset = false;
    let requestData = data;
    while (true) {
      try {
        const remaining = Math.max(10_000, deadline - Date.now());
        const response = await api.post(`/practice/${id}/start`, requestData, {
          timeout: Math.min(360_000, remaining),
        });
        return response.data;
      } catch (error: unknown) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const responseData = error.response?.data as
          | {
              preparing?: boolean;
              retryAfterSeconds?: number;
              resetIdempotency?: boolean;
            }
          | undefined;
        if (
          error.response?.status === 409 &&
          responseData?.resetIdempotency === true &&
          !idempotencyReset &&
          Date.now() < deadline
        ) {
          idempotencyReset = true;
          requestData = {
            ...requestData,
            idempotencyKey: createRecoveryIdempotencyKey(),
          };
          continue;
        }
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
    const deadline = Date.now() + FINISH_RECOVERY_TIMEOUT_MS;

    while (true) {
      try {
        const response = await api.post(`/ai/interview/${runId}/finish`, data, {
          timeout: FINISH_RECOVERY_TIMEOUT_MS,
        });
        return response.data;
      } catch (error: unknown) {
        if (
          !axios.isAxiosError(error) ||
          error.response?.status !== 409 ||
          (error.response.data as { evaluating?: unknown } | undefined)
            ?.evaluating !== true
        ) {
          throw error;
        }

        if (Date.now() >= deadline) throw error;
        await wait(2_000);

        try {
          const resultResponse = await api.get(`/ai/interview/${runId}/result`, {
            timeout: 30_000,
          });
          if (resultResponse.data?.success) {
            return {
              success: true,
              result: resultResponse.data.run?.result,
              alreadyCompleted: true,
            };
          }
        } catch (resultError: unknown) {
          if (
            !axios.isAxiosError(resultError) ||
            resultError.response?.status !== 409
          ) {
            throw resultError;
          }
        }
      }
    }
  },

  submitOpening: async (
    runId: string,
    data: PracticeOpeningPayload
  ): Promise<PracticeOpeningResponse> => {
    const response = await api.post(`/ai/interview/${runId}/opening`, data, {
      timeout: 30_000,
    });
    return response.data;
  },

  getHistory: async (
    page = 1,
    source: PracticeHistorySource | "all" = "all",
    limit = 20
  ): Promise<PracticeHistoryResponse> => {
    const response = await api.get("/practice/history", {
      params: { page, source, limit },
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
