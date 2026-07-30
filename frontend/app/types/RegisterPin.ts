import { Document } from "mongoose";

export interface IRegisterPin extends Document {
  email: string;
  username: string;
  passwordHash: string;
  pinHash: string;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
