import mongoose, { Document } from "mongoose";

export interface IPracticeRunQuestion {
  id: string;
  text: string;
  ttsText?: string;
  acknowledgementText?: string;
  transitionText?: string;
  spokenText?: string;
  transitionType?:
    | "opening_to_first"
    | "continue_competency"
    | "probe_gap"
    | "bridge_to_next_competency";
  competency: string;
  difficulty?: string;
  expectedSignals?: string[];
  groundingIds?: string[];
}

export interface IPracticeRunAnswer {
  questionId: string;
  question: string;
  transcript: string;
  editedAnswer?: string;
  audioDurationSec?: number;
  audioId?: mongoose.Types.ObjectId;
  assemblySessionId?: string;
  transcriptionProvider?: string;
  groundingIds?: string[];
}

export interface CandidateIntroItem {
  category: string;
  label: string;
  value: string;
  evidence: string[];
}

export interface IPracticeRunCandidateIntro {
  prompt: string;
  transcript: string;
  audioDurationSec?: number;
  assemblySessionId?: string;
  transcriptionProvider?: string;
  items?: CandidateIntroItem[];
  createdAt: Date;
}

export interface IPracticeRun extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  aiRunId: string;
  status:
    | "STARTED"
    | "IN_PROGRESS"
    | "EVALUATING"
    | "COMPLETED"
    | "FAILED"
    | "REFUNDED"
    | "CANCELLED";
  evaluationStartedAt?: Date;
  startLeaseId?: string;
  startLeaseExpiresAt?: Date;
  startRequestHash?: string;
  language: string;
  voiceId: string;
  autoTurnTaking: boolean;
  textAnswerEnabled: boolean;
  difficulty: string;
  questionCount: number;
  questions: IPracticeRunQuestion[];
  answers: IPracticeRunAnswer[];
  candidateIntro?: IPracticeRunCandidateIntro;
  servedQuestionIds: string[];
  evaluation?: unknown;
  creditUsage: {
    quotedCredits: number;
    chargedCredits: number;
    refundedCredits: number;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheHitTokens: number;
    cacheMissTokens: number;
    reasoningTokens: number;
    requestCount: number;
    latencyMs: number;
    estimatedCostUsd: number;
    model: string;
    models: string[];
  };
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
