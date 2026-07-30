import { Document } from "mongoose";

export interface IFogetPasswordPin extends Document {
  email: string;
  pinHash: string;
  verified: boolean;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
