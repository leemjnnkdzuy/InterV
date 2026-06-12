import api from "@/app/lib/Client";
import type { InterviewVoice } from "@/app/types";

export const aiService = {
  getVoices: async (
    language: string
  ): Promise<{ success: boolean; voices: InterviewVoice[]; message?: string }> => {
    const response = await api.get(`/ai/voices?language=${encodeURIComponent(language)}`);
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
    const response = await api.post("/ai/tts/preview", data);
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
    });
    return response.data;
  },
};
