import api from "@/app/lib/Client";
import type { InterviewAnswerResponse, InterviewVoice } from "@/app/types";

export const aiService = {
  getVoices: async (
    language: string
  ): Promise<{ success: boolean; voices: InterviewVoice[]; message?: string }> => {
    const response = await api.get(
      `/ai/voices?language=${encodeURIComponent(language)}&provider=vbee-v2`,
      { headers: { "Cache-Control": "no-cache" } }
    );
    return response.data;
  },

  previewTts: async (data: {
    text: string;
    language: string;
    voiceId: string;
  }): Promise<{
    success: boolean;
    audioBase64: string;
    contentType: string;
    cached: boolean;
    message?: string;
  }> => {
    const response = await api.post("/ai/tts/preview", data, {
      timeout: 100_000,
    });
    return response.data;
  },

  previewVoice: async (data: {
    text: string;
    language: string;
    voiceId: string;
  }): Promise<{
    success: boolean;
    audioBase64: string;
    contentType: string;
    cached: boolean;
    message?: string;
  }> => {
    const response = await api.post("/ai/voices/preview", data, {
      timeout: 100_000,
    });
    return response.data;
  },

  extractJd: async (
    file: File,
    onUploadProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    markdown: string;
    normalized?: unknown;
    message?: string;
  }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/ai/jd/extract", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!event.total || !onUploadProgress) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
      timeout: 180_000,
    });
    return response.data;
  },

  transcribeAnswer: async (
    runId: string,
    audio: Blob
  ): Promise<{
    success: boolean;
    transcript: string;
    language?: string;
    durationSec?: number;
    provider?: string;
    message?: string;
  }> => {
    const formData = new FormData();
    formData.append("file", audio, "answer.webm");
    const response = await api.post(`/ai/interview/${runId}/transcribe`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 300_000,
    });
    return response.data;
  },

  createStreamingToken: async (
    runId: string
  ): Promise<{
    success: boolean;
    token: string;
    expiresInSeconds: number;
    websocketUrl: string;
    speechModel: string;
    languageCode: string;
    sampleRate: number;
    message?: string;
  }> => {
    const response = await api.post(`/ai/interview/${runId}/stream-token`);
    return response.data;
  },

  submitInterviewAnswer: async (
    runId: string,
    data: {
      questionId: string;
      answer: string;
      audio?: Blob;
      durationSec?: number;
      assemblySessionId?: string;
      transcriptionProvider: string;
    }
  ): Promise<InterviewAnswerResponse> => {
    const formData = new FormData();
    formData.set("questionId", data.questionId);
    formData.set("answer", data.answer);
    formData.set("transcriptionProvider", data.transcriptionProvider);
    if (data.durationSec !== undefined) {
      formData.set("durationSec", String(data.durationSec));
    }
    if (data.assemblySessionId) {
      formData.set("assemblySessionId", data.assemblySessionId);
    }
    if (data.audio && data.audio.size > 0) {
      const extension = data.audio.type.includes("mp4") ? "m4a" : "webm";
      formData.set("audio", data.audio, `answer.${extension}`);
    }

    const response = await api.post(
      `/ai/interview/${runId}/answer`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 90_000,
      }
    );
    return response.data;
  },
};
