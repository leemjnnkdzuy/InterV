import "server-only";

import { randomInt } from "node:crypto";
import mongoose from "mongoose";

import CreditLog from "@/app/models/CreditLog";
import Transaction from "@/app/models/Transaction";
import User from "@/app/models/User";
import { publishCreditUpdated } from "@/app/lib/CreditEvents";
import { getPayOS } from "@/app/lib/PayOS";

const PROVIDER_STATUSES = new Set([
  "PENDING",
  "CANCELLED",
  "UNDERPAID",
  "PAID",
  "EXPIRED",
  "PROCESSING",
  "FAILED",
]);

interface ProviderPaymentInfo {
  id: string;
  orderCode: number;
  amount: number;
  amountPaid: number;
  status: string;
  cancellationReason?: string | null;
  canceledAt?: string | null;
}

export class PaymentIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentIntegrityError";
  }
}

function reconciliationErrorCode(error: unknown): string {
  if (
    error instanceof PaymentIntegrityError ||
    (error instanceof Error &&
      [
        "TRANSACTION_NOT_FOUND",
        "TRANSACTION_NOT_SETTLEABLE",
        "PAYOS_CANCELLATION_NOT_CONFIRMED",
      ].includes(error.message))
  ) {
    return error.message;
  }
  return "PAYOS_REQUEST_FAILED";
}

export function createOrderCode(): number {
  return randomInt(100_000_000_000, 1_000_000_000_000);
}

export function getApplicationOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      return "http://localhost:3000";
    }
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  const url = new URL(configured);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid HTTPS origin");
  }
  return url.origin;
}

export async function settlePaidTransaction(
  transactionId: mongoose.Types.ObjectId,
  paidAt = new Date()
): Promise<"settled" | "already-settled" | "not-found"> {
  const dbSession = await mongoose.startSession();
  let outcome: "settled" | "already-settled" | "not-found" = "not-found";
  let settledUserId: string | null = null;
  let settledBalance = 0;
  let settledDelta = 0;
  let settledReferenceId = "";
  try {
    await dbSession.withTransaction(
      async () => {
        const transaction = await Transaction.findById(transactionId).session(
          dbSession
        );
        if (!transaction) {
          outcome = "not-found";
          return;
        }
        if (transaction.status === "PAID") {
          outcome = "already-settled";
          return;
        }
        if (!["PENDING", "CANCELLED"].includes(transaction.status)) {
          outcome = "not-found";
          return;
        }

        const userUpdate = await User.findOneAndUpdate(
          { _id: transaction.userId, isActive: true },
          { $inc: { credits: transaction.credits } },
          { returnDocument: "after", session: dbSession }
        ).select("credits");
        if (!userUpdate) {
          throw new Error("Payment owner is missing or inactive");
        }

        await CreditLog.create(
          [
            {
              userId: transaction.userId,
              credits: transaction.credits,
              action: "RECHARGE",
              referenceId: String(transaction.orderCode),
              description: `Nạp thành công ${transaction.credits} Credits qua PayOS (Giao dịch #${transaction.orderCode})`,
            },
          ],
          { session: dbSession }
        );
        transaction.status = "PAID";
        transaction.providerStatus = "PAID";
        transaction.paidAt = paidAt;
        transaction.lastReconciledAt = new Date();
        transaction.reconciliationError = "";
        await transaction.save({ session: dbSession });
        settledUserId = transaction.userId.toString();
        settledBalance = userUpdate.credits;
        settledDelta = transaction.credits;
        settledReferenceId = String(transaction.orderCode);
        outcome = "settled";
      },
      {
        readPreference: "primary",
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        maxCommitTimeMS: 10_000,
      }
    );
    if (settledUserId) {
      publishCreditUpdated({
        userId: settledUserId,
        balance: settledBalance,
        delta: settledDelta,
        referenceId: settledReferenceId,
        reason: "RECHARGE",
      });
    }
    return outcome;
  } finally {
    await dbSession.endSession();
  }
}

function validateProviderPayment(
  transaction: {
    orderCode: number;
    amount: number;
    paymentLinkId?: string;
  },
  payment: ProviderPaymentInfo
): string {
  const providerStatus = String(payment.status || "").toUpperCase();
  if (!PROVIDER_STATUSES.has(providerStatus)) {
    throw new PaymentIntegrityError("PAYOS_STATUS_INVALID");
  }
  if (
    payment.orderCode !== transaction.orderCode ||
    payment.amount !== transaction.amount ||
    (transaction.paymentLinkId &&
      payment.id !== transaction.paymentLinkId)
  ) {
    throw new PaymentIntegrityError("PAYOS_TRANSACTION_MISMATCH");
  }
  if (
    providerStatus === "PAID" &&
    Number(payment.amountPaid) < transaction.amount
  ) {
    throw new PaymentIntegrityError("PAYOS_PAID_AMOUNT_MISMATCH");
  }
  return providerStatus;
}

async function applyProviderPayment(
  transactionId: mongoose.Types.ObjectId,
  transaction: {
    orderCode: number;
    amount: number;
    paymentLinkId?: string;
  },
  payment: ProviderPaymentInfo
) {
  const providerStatus = validateProviderPayment(transaction, payment);
  const reconciledAt = new Date();
  if (providerStatus === "PAID") {
    const outcome = await settlePaidTransaction(
      transactionId,
      reconciledAt
    );
    if (outcome === "not-found") {
      throw new Error("TRANSACTION_NOT_SETTLEABLE");
    }
    return { status: "PAID" as const, providerStatus, outcome };
  }

  const terminal = ["CANCELLED", "EXPIRED", "FAILED"].includes(
    providerStatus
  );
  await Transaction.updateOne(
    { _id: transactionId, status: { $ne: "PAID" } },
    {
      $set: {
        status: terminal ? "CANCELLED" : "PENDING",
        providerStatus,
        lastReconciledAt: reconciledAt,
        cancellationReason:
          typeof payment.cancellationReason === "string"
            ? payment.cancellationReason.slice(0, 500)
            : "",
        ...(terminal
          ? {
              cancelledAt: payment.canceledAt
                ? new Date(payment.canceledAt)
                : reconciledAt,
            }
          : {}),
        reconciliationError: "",
      },
    }
  );
  return {
    status: terminal ? ("CANCELLED" as const) : ("PENDING" as const),
    providerStatus,
    outcome: "reconciled" as const,
  };
}

export async function reconcilePayOSPayment(
  transactionId: mongoose.Types.ObjectId
) {
  const transaction = await Transaction.findById(transactionId)
    .select("orderCode amount paymentLinkId status")
    .lean();
  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }
  try {
    const payment = await getPayOS().paymentRequests.get(
      transaction.orderCode
    );
    return await applyProviderPayment(
      transaction._id,
      transaction,
      payment
    );
  } catch (error) {
    await Transaction.updateOne(
      { _id: transaction._id },
      {
        $set: {
          lastReconciledAt: new Date(),
          reconciliationError:
            reconciliationErrorCode(error),
        },
      }
    ).catch(() => undefined);
    throw error;
  }
}

export async function cancelPayOSPayment(
  transactionId: mongoose.Types.ObjectId,
  reason: string
) {
  const transaction = await Transaction.findById(transactionId)
    .select("orderCode amount paymentLinkId status")
    .lean();
  if (!transaction) {
    throw new Error("TRANSACTION_NOT_FOUND");
  }
  if (transaction.status === "PAID") {
    throw new Error("TRANSACTION_ALREADY_PAID");
  }
  const payment = await getPayOS().paymentRequests.cancel(
    transaction.orderCode,
    reason.slice(0, 500)
  );
  const providerStatus = validateProviderPayment(transaction, payment);
  if (!["CANCELLED", "EXPIRED", "FAILED"].includes(providerStatus)) {
    throw new Error("PAYOS_CANCELLATION_NOT_CONFIRMED");
  }
  return applyProviderPayment(transaction._id, transaction, payment);
}
