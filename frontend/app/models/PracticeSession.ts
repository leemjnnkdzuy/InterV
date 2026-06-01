import mongoose, { Model, Schema } from "mongoose";
import { IPracticeSession } from "@/app/types";

const practiceSessionSchema = new Schema<IPracticeSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        feedback: { type: String, required: true },
        ratings: {
          communication: { type: Number, required: true },
          knowledge: { type: Number, required: true },
          problemSolving: { type: Number, required: true },
          confidence: { type: Number, required: true },
        },
        questions: {
          type: [
            {
              question: { type: String, required: true },
              answer: { type: String, required: true },
              feedback: { type: String, required: true },
              score: { type: Number, required: true },
            },
          ],
          default: [],
        },
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
