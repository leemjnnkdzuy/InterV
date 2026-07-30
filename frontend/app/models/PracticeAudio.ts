import mongoose, { Model, Schema } from "mongoose";
import { IPracticeAudio } from "@/app/types";

const practiceAudioSchema = new Schema<IPracticeAudio>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    runId: {
      type: Schema.Types.ObjectId,
      ref: "PracticeRun",
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "PracticeSession",
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    audioData: {
      type: Buffer,
      select: false,
    },
    audioBase64: {
      type: String,
      select: false,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    durationSec: {
      type: Number,
    },
    assemblySessionId: {
      type: String,
      default: "",
    },
    transcript: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

practiceAudioSchema.index({ runId: 1, questionId: 1 }, { unique: true });

const PracticeAudio: Model<IPracticeAudio> =
  mongoose.models.PracticeAudio ||
  mongoose.model<IPracticeAudio>("PracticeAudio", practiceAudioSchema);

export default PracticeAudio;
