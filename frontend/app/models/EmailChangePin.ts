import mongoose, { Model, Schema } from "mongoose";
import { IEmailChangePin } from "@/app/types";

const emailChangePinSchema = new Schema<IEmailChangePin>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    currentEmailPinHash: {
      type: String,
      required: true,
      select: false,
    },
    currentEmailVerified: {
      type: Boolean,
      default: false,
    },
    newEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    newEmailPinHash: {
      type: String,
      default: null,
      select: false,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.EmailChangePin) {
  delete mongoose.models.EmailChangePin;
}

const EmailChangePin: Model<IEmailChangePin> =
  mongoose.model<IEmailChangePin>("EmailChangePin", emailChangePinSchema);

export default EmailChangePin;
