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
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    paymentLinkId: {
      type: String,
      required: true,
    },
    paymentUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
