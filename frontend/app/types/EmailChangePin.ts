import mongoose, { Document } from "mongoose";

export interface IEmailChangePin extends Document {
  userId: mongoose.Types.ObjectId;
  currentEmailPin: string;
  currentEmailVerified: boolean;
  newEmail: string | null;
  newEmailPin: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
