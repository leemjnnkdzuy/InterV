import mongoose, { Document } from "mongoose";

export interface IPracticeRunQuestion {
  id: string;
  text: string;
  competency: string;
  difficulty?: string;
}

export interface IPracticeRunAnswer {
  questionId: string;
  question: string;
  transcript: string;
  editedAnswer?: string;
  audioDurationSec?: number;
}

export interface IPracticeRun extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "REFUNDED";
  language: string;
  voiceId: string;
  difficulty: string;
  questionCount: number;
  questions: IPracticeRunQuestion[];
  answers: IPracticeRunAnswer[];
  evaluation?: unknown;
  creditUsage: {
    quotedCredits: number;
    chargedCredits: number;
    refundedCredits: number;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  };
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
