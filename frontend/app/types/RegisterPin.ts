import { Document } from "mongoose";

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
