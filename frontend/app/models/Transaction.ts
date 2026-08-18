import mongoose, { Model, Schema } from "mongoose";
import { ITransaction } from "@/app/types";

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderCode: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    packageId: {
      type: String,
      maxlength: 40,
    },
    amount: {
      type: Number,
      required: true,
    },
    credits: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    providerStatus: {
      type: String,
      enum: [
        "PENDING",
        "CANCELLED",
        "UNDERPAID",
        "PAID",
        "EXPIRED",
        "PROCESSING",
        "FAILED",
      ],
      default: "PENDING",
      index: true,
    },
    paymentLinkId: {
      type: String,
      default: "",
    },
    paymentUrl: {
      type: String,
      maxlength: 2_048,
    },
    qrCode: { type: String, maxlength: 4_096 },
    bin: { type: String, maxlength: 32 },
    accountNumber: { type: String, maxlength: 64 },
    accountName: { type: String, maxlength: 128 },
    description: { type: String, maxlength: 255 },
    paidAt: { type: Date },
    expiresAt: { type: Date },
    cancelledAt: { type: Date },
    lastReconciledAt: { type: Date },
    cancellationReason: { type: String, default: "", maxlength: 500 },
    reconciliationError: { type: String, default: "", maxlength: 500 },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ createdAt: -1, status: 1 });
transactionSchema.index({ paidAt: -1, status: 1 });

if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
