import mongoose, { Document } from "mongoose";

export interface IEmailChangePin extends Document {
  userId: mongoose.Types.ObjectId;
  currentEmailPinHash: string;
  currentEmailVerified: boolean;
  newEmail: string | null;
  newEmailPinHash: string | null;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
