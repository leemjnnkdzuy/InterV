import mongoose, { Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  orderCode: number;
  amount: number;
  credits: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  providerStatus?:
    | "PENDING"
    | "CANCELLED"
    | "UNDERPAID"
    | "PAID"
    | "EXPIRED"
    | "PROCESSING"
    | "FAILED";
  paymentLinkId: string;
  paymentUrl?: string;
  paidAt?: Date;
  cancelledAt?: Date;
  lastReconciledAt?: Date;
  cancellationReason?: string;
  reconciliationError?: string;
  createdAt: Date;
  updatedAt: Date;
}
