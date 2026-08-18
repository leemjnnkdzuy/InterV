import mongoose, { Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  orderCode: number;
  packageId?: string;
  amount: number;
  credits: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
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
  qrCode?: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  paidAt?: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
  lastReconciledAt?: Date;
  cancellationReason?: string;
  reconciliationError?: string;
  createdAt: Date;
  updatedAt: Date;
}
