import { Document } from "mongoose";

export interface IFogetPasswordPin extends Document {
  email: string;
  pin: string;
  verified: boolean;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
