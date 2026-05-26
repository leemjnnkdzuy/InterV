import mongoose, { Model, Schema } from "mongoose";
import { IFogetPasswordPin } from "@/app/types";

const fogetPasswordPinSchema = new Schema<IFogetPasswordPin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    pin: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
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

if (mongoose.models.FogetPasswordPin) {
  delete mongoose.models.FogetPasswordPin;
}

const FogetPasswordPin: Model<IFogetPasswordPin> =
  mongoose.model<IFogetPasswordPin>(
    "FogetPasswordPin",
    fogetPasswordPinSchema
  );

export default FogetPasswordPin;
