import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRegisterPin extends Document {
  email: string;
  username: string;
  password: string;
  pin: string;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const registerPinSchema = new Schema<IRegisterPin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    pin: {
      type: String,
      required: true,
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

if (mongoose.models.RegisterPin) {
  delete mongoose.models.RegisterPin;
}

const RegisterPin: Model<IRegisterPin> =
  mongoose.model<IRegisterPin>("RegisterPin", registerPinSchema);

export default RegisterPin;
