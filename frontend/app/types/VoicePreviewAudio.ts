import type { Document } from "mongoose";

export interface IVoicePreviewAudio extends Document {
  cacheKey: string;
  language: string;
  voiceId: string;
  sampleHash: string;
  sampleText: string;
  audioBase64: string;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VoicePreviewAudioResult = {
  audioBase64: string;
  contentType: string;
  cached: boolean;
};
