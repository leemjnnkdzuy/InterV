import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Transaction from "@/app/models/Transaction";
import CreditLog from "@/app/models/CreditLog";
import payos from "@/app/lib/PayOS";
import { getErrorMessage } from "@/app/lib/Utils";

interface PayOSWebhookData {
  orderCode: number;
  status: string;
}

function isPayOSWebhookData(value: unknown): value is PayOSWebhookData {
  return (
    typeof value === "object" &&
    value !== null &&
    "orderCode" in value &&
    typeof value.orderCode === "number" &&
    "status" in value &&
    typeof value.status === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature using PayOS SDK
    let verifiedData: PayOSWebhookData;
    try {
      const payload = await payos.webhooks.verify(body);
      if (!isPayOSWebhookData(payload)) {
        return NextResponse.json(
          { success: false, message: "Invalid webhook payload" },
          { status: 400 }
        );
      }
      verifiedData = payload;
    } catch (sigError: unknown) {
      console.error(
        "PayOS Webhook Signature Verification Failed:",
        getErrorMessage(sigError, "Unknown PayOS signature error")
      );
      return NextResponse.json(
        { success: false, message: "Signature verification failed" },
        { status: 400 }
      );
    }

    const { orderCode, status } = verifiedData;

    // We only process if status is success/paid
    if (status === "PAID" || status === "completed") {
      await connectDB();

      // Atomically update transaction to paid
      const transaction = await Transaction.findOneAndUpdate(
        { orderCode, status: "PENDING" },
        { $set: { status: "PAID" } },
        { returnDocument: 'after' }
      );

      if (transaction) {
        // Increment user credits
        await User.updateOne(
          { _id: transaction.userId },
          { $inc: { credits: transaction.credits } }
        );

        // Log the credit log
        await CreditLog.create({
          userId: transaction.userId,
          credits: transaction.credits,
          action: "RECHARGE",
          description: `Nạp thành công ${transaction.credits} Credits qua PayOS Webhook (Giao dịch #${orderCode})`,
        });

        console.log(`[PAYOS WEBHOOK] Successfully credited ${transaction.credits} credits to user ${transaction.userId} for orderCode ${orderCode}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error: unknown) {
    console.error("POST /api/payment/webhook error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
