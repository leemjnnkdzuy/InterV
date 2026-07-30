import mongoose, { Document } from "mongoose";

export type AiUsageOperation =
  | "interview_start"
  | "interview_follow_up"
  | "interview_evaluate";

export interface IAiUsageEvent {
  _id: mongoose.Types.ObjectId;
  eventKey: string;
  provider: "deepseek";
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  practiceRunId: mongoose.Types.ObjectId;
  aiRunId?: string;
  operation: AiUsageOperation;
  status: "SUCCESS" | "FAILED";
  model: string;
  requestCount: number;
  successfulRequestCount: number;
  failedRequestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  reasoningTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  pricingSnapshot: {
    cacheHitInputUsdPerMillion: number;
    cacheMissInputUsdPerMillion: number;
    outputUsdPerMillion: number;
  };
  providerRequestIds: string[];
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiProviderSetting extends Document {
  provider: "deepseek";
  pricing: Array<{
    model: string;
    cacheHitInputUsdPerMillion: number;
    cacheMissInputUsdPerMillion: number;
    outputUsdPerMillion: number;
  }>;
  monthlyBudgetUsd: number;
  lowBalanceThresholdUsd: number;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
