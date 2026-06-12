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
    status: {
      type: String,
      enum: ["STARTED", "IN_PROGRESS", "COMPLETED", "FAILED", "REFUNDED"],
      default: "STARTED",
      index: true,
    },
    language: {
      type: String,
      default: "vi-VN",
    },
    voiceId: {
      type: String,
      default: "vi-VN-HoaiMyNeural",
    },
    difficulty: {
      type: String,
      default: "Middle",
    },
    questionCount: {
      type: Number,
      default: 3,
    },
    questions: {
      type: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          competency: { type: String, default: "" },
          difficulty: { type: String, default: "" },
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
        },
      ],
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
      model: { type: String, default: "" },
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

if (mongoose.models.PracticeRun) {
  delete mongoose.models.PracticeRun;
}

const PracticeRun: Model<IPracticeRun> = mongoose.model<IPracticeRun>(
  "PracticeRun",
  practiceRunSchema
);

export default PracticeRun;
