import mongoose, { Model, Schema } from "mongoose";
import { IPracticeRun } from "@/app/types";

const practiceRunSchema = new Schema<IPracticeRun>(
  {
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
    aiRunId: {
      type: String,
      default: "",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "STARTED",
        "IN_PROGRESS",
        "EVALUATING",
        "COMPLETED",
        "FAILED",
        "REFUNDED",
      ],
      default: "STARTED",
      index: true,
    },
    evaluationStartedAt: {
      type: Date,
    },
    startLeaseId: {
      type: String,
      default: "",
    },
    startLeaseExpiresAt: {
      type: Date,
    },
    startRequestHash: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "vi-VN",
    },
    voiceId: {
      type: String,
      default: "hn_female_ngochuyen_full_48k-fhg",
    },
    autoTurnTaking: {
      type: Boolean,
      default: false,
    },
    textAnswerEnabled: {
      type: Boolean,
      default: false,
    },
    difficulty: {
      type: String,
      default: "Middle",
    },
    questionCount: {
      type: Number,
      default: 5,
      min: 5,
      max: 25,
    },
    questions: {
      type: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          ttsText: { type: String, default: "" },
          competency: { type: String, default: "" },
          difficulty: { type: String, default: "" },
          expectedSignals: { type: [String], default: [] },
          groundingIds: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    answers: {
      type: [
        {
          questionId: { type: String, required: true },
          question: { type: String, required: true },
          transcript: { type: String, default: "" },
          editedAnswer: { type: String, default: "" },
          audioDurationSec: { type: Number },
          audioId: { type: Schema.Types.ObjectId, ref: "PracticeAudio" },
          assemblySessionId: { type: String, default: "" },
          transcriptionProvider: { type: String, default: "" },
          groundingIds: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    candidateIntro: {
      prompt: { type: String, default: "" },
      transcript: { type: String, default: "" },
      audioDurationSec: { type: Number },
      assemblySessionId: { type: String, default: "" },
      transcriptionProvider: { type: String, default: "" },
      items: {
        type: [
          {
            category: { type: String, required: true },
            label: { type: String, required: true },
            value: { type: String, required: true },
            evidence: { type: [String], default: [] },
          },
        ],
        default: undefined,
      },
      createdAt: { type: Date, default: Date.now },
    },
    servedQuestionIds: {
      type: [String],
      default: [],
    },
    evaluation: {
      type: Schema.Types.Mixed,
    },
    creditUsage: {
      quotedCredits: { type: Number, required: true },
      chargedCredits: { type: Number, default: 0 },
      refundedCredits: { type: Number, default: 0 },
    },
    tokenUsage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
      cacheHitTokens: { type: Number, default: 0 },
      cacheMissTokens: { type: Number, default: 0 },
      reasoningTokens: { type: Number, default: 0 },
      requestCount: { type: Number, default: 0 },
      latencyMs: { type: Number, default: 0 },
      estimatedCostUsd: { type: Number, default: 0 },
      model: { type: String, default: "" },
      models: { type: [String], default: [] },
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

practiceRunSchema.index(
  { userId: 1, sessionId: 1, idempotencyKey: 1 },
  { unique: true }
);
practiceRunSchema.index({ status: 1, startLeaseExpiresAt: 1 });
practiceRunSchema.index({ userId: 1, updatedAt: -1 });

if (mongoose.models.PracticeRun) {
  delete mongoose.models.PracticeRun;
}

const PracticeRun: Model<IPracticeRun> = mongoose.model<IPracticeRun>(
  "PracticeRun",
  practiceRunSchema
);

export default PracticeRun;
