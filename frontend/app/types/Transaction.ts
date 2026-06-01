import mongoose, { Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  orderCode: number;
  amount: number;
  credits: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentLinkId: string;
  paymentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
