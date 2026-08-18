import mongoose, { Model, Schema } from "mongoose";

import type { IAiUsageEvent } from "@/app/types/AiUsage";

const aiUsageEventSchema = new Schema<IAiUsageEvent>(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 64,
    },
    provider: {
      type: String,
      enum: ["deepseek"],
      default: "deepseek",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "PracticeSession",
      required: true,
      index: true,
    },
    practiceRunId: {
      type: Schema.Types.ObjectId,
      ref: "PracticeRun",
      required: true,
      index: true,
    },
    aiRunId: {
      type: String,
      default: "",
      maxlength: 160,
      index: true,
    },
    operation: {
      type: String,
      enum: [
        "interview_start",
        "interview_follow_up",
        "interview_evaluate",
        "interview_profile_extract",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    model: { type: String, default: "", maxlength: 120, index: true },
    requestCount: { type: Number, default: 0, min: 0 },
    successfulRequestCount: { type: Number, default: 0, min: 0 },
    failedRequestCount: { type: Number, default: 0, min: 0 },
    promptTokens: { type: Number, default: 0, min: 0 },
    completionTokens: { type: Number, default: 0, min: 0 },
    totalTokens: { type: Number, default: 0, min: 0 },
    cacheHitTokens: { type: Number, default: 0, min: 0 },
    cacheMissTokens: { type: Number, default: 0, min: 0 },
    reasoningTokens: { type: Number, default: 0, min: 0 },
    latencyMs: { type: Number, default: 0, min: 0 },
    estimatedCostUsd: { type: Number, default: 0, min: 0 },
    pricingSnapshot: {
      cacheHitInputUsdPerMillion: { type: Number, required: true, min: 0 },
      cacheMissInputUsdPerMillion: {
        type: Number,
        required: true,
        min: 0,
      },
      outputUsdPerMillion: { type: Number, required: true, min: 0 },
    },
    providerRequestIds: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) =>
          items.length <= 10 && items.every((item) => item.length <= 200),
        message: "providerRequestIds exceeds the allowed size",
      },
    },
    errorCode: { type: String, default: "", maxlength: 80 },
    errorMessage: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

aiUsageEventSchema.index({ createdAt: -1, provider: 1 });
aiUsageEventSchema.index({ model: 1, createdAt: -1 });
aiUsageEventSchema.index({ status: 1, createdAt: -1 });
aiUsageEventSchema.index({ practiceRunId: 1, operation: 1, createdAt: -1 });

if (mongoose.models.AiUsageEvent) {
  delete mongoose.models.AiUsageEvent;
}

const AiUsageEvent: Model<IAiUsageEvent> =
  mongoose.model<IAiUsageEvent>("AiUsageEvent", aiUsageEventSchema);

export default AiUsageEvent;
