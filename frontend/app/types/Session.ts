import mongoose, { Document } from "mongoose";

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  deviceInfo: string;
  ipAddress: string;
  isActive: boolean;
  lastActiveAt: Date;
  refreshTokenHash: string;
  previousRefreshTokenHash: string;
  previousRefreshValidUntil?: Date;
  refreshExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
