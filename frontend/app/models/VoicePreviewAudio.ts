import mongoose, { Model, Schema } from "mongoose";
import type { IVoicePreviewAudio } from "@/app/types";

const voicePreviewAudioSchema = new Schema<IVoicePreviewAudio>(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
      index: true,
    },
    voiceId: {
      type: String,
      required: true,
      index: true,
    },
    sampleHash: {
      type: String,
      required: true,
    },
    sampleText: {
      type: String,
      required: true,
    },
    audioBase64: {
      type: String,
      required: true,
      select: false,
    },
    contentType: {
      type: String,
      required: true,
      default: "audio/mpeg",
    },
  },
  { timestamps: true }
);

const VoicePreviewAudio: Model<IVoicePreviewAudio> =
  mongoose.models.VoicePreviewAudio ||
  mongoose.model<IVoicePreviewAudio>(
    "VoicePreviewAudio",
    voicePreviewAudioSchema
  );

export default VoicePreviewAudio;
