import mongoose, { Document } from "mongoose";

export interface ICreditLog extends Document {
  userId: mongoose.Types.ObjectId;
  credits: number;
  action: "RECHARGE" | "AI_INTERVIEW" | "REGISTER_BONUS" | "ADMIN_ADJUST";
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
