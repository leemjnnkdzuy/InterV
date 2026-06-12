import mongoose, { Document } from "mongoose";

export interface ICreditLog extends Document {
  userId: mongoose.Types.ObjectId;
  credits: number;
  action:
    | "RECHARGE"
    | "AI_INTERVIEW"
    | "AI_INTERVIEW_REFUND"
    | "AI_JD_EXTRACT"
    | "REGISTER_BONUS"
    | "ADMIN_ADJUST";
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
