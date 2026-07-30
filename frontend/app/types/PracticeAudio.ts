import mongoose, { Document } from "mongoose";

export interface IPracticeAudio extends Document {
  userId: mongoose.Types.ObjectId;
  runId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  questionId: string;
  mimeType: string;
  audioData?: Buffer;
  audioBase64?: string;
  sizeBytes: number;
  durationSec?: number;
  assemblySessionId?: string;
  transcript?: string;
  createdAt: Date;
  updatedAt: Date;
}
