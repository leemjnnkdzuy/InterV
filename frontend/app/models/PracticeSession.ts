import mongoose, { Model, Schema } from "mongoose";
import { IPracticeSession } from "@/app/types";

const practiceSessionSchema = new Schema<IPracticeSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["practice", "recruitment"],
      default: "practice",
      index: true,
    },
    recruitmentCampaignId: {
      type: Schema.Types.ObjectId,
      ref: "RecruitmentCampaign",
      index: true,
    },
    recruitmentInvitationId: {
      type: Schema.Types.ObjectId,
      ref: "RecruitmentInvitation",
      unique: true,
      sparse: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    scheduledAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    maxAttempts: {
      type: Number,
      min: 1,
      max: 3,
      default: 1,
    },
    lockedConfig: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      required: [true, "Tiêu đề buổi phỏng vấn là bắt buộc"],
      trim: true,
    },
    jobDescription: {
      type: String,
      default: "",
    },
    topic: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      default: "Công nghệ thông tin",
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
      default: 5,
      min: 5,
      max: 25,
    },
    tags: {
      type: [String],
      default: [],
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    highestScore: {
      type: Number,
      default: 0,
    },
    latestResult: {
      type: {
        score: { type: Number, required: true },
        duration: { type: String, required: true },
        durationSec: { type: Number, required: false },
        feedback: { type: String, required: true },
        ratings: {
          communication: { type: Number, required: true },
          knowledge: { type: Number, required: true },
          problemSolving: { type: Number, required: true },
          confidence: { type: Number, required: true },
          jdFit: { type: Number, required: false },
          composure: { type: Number, required: false },
          vocalDelivery: { type: Number, required: false },
        },
        strengths: { type: [String], default: [] },
        weaknesses: { type: [String], default: [] },
        recommendations: { type: [String], default: [] },
        audioAnalysis: {
          confidence: { type: Number, required: false },
          composure: { type: Number, required: false },
          vocalDelivery: { type: Number, required: false },
          dominantEmotion: { type: String, required: false },
          observations: { type: [String], default: [] },
          provider: { type: String, required: false },
        },
        provider: { type: String, required: false },
        questions: {
          type: [
            {
              question: { type: String, required: true },
              answer: { type: String, required: true },
              feedback: { type: String, required: true },
              score: { type: Number, required: true },
              evidence: { type: [String], default: [] },
              groundingIds: { type: [String], default: [] },
            },
          ],
          default: [],
        },
        groundingIds: { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now },
      },
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.PracticeSession) {
  delete mongoose.models.PracticeSession;
}

const PracticeSession: Model<IPracticeSession> = mongoose.model<IPracticeSession>(
  "PracticeSession",
  practiceSessionSchema
);

export default PracticeSession;
