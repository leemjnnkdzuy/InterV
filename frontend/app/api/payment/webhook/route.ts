import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import type { Webhook } from "@payos/node";

import connectDB from "@/app/lib/ConnectDB";
import Transaction from "@/app/models/Transaction";
import { getPayOS } from "@/app/lib/PayOS";
import { getErrorMessage } from "@/app/lib/Utils";
import { settlePaidTransaction } from "@/app/lib/PaymentSettlement";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

interface PayOSWebhookData {
  orderCode: number;
  amount: number;
  code: string;
  paymentLinkId: string;
}

function isWebhookEnvelope(value: unknown): value is Webhook {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    "desc" in value &&
    typeof value.desc === "string" &&
    "success" in value &&
    typeof value.success === "boolean" &&
    "signature" in value &&
    typeof value.signature === "string" &&
    value.signature.length <= 256 &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null
  );
}

function isPayOSWebhookData(value: unknown): value is PayOSWebhookData {
  return (
    typeof value === "object" &&
    value !== null &&
    "orderCode" in value &&
    typeof value.orderCode === "number" &&
    Number.isSafeInteger(value.orderCode) &&
    "amount" in value &&
    typeof value.amount === "number" &&
    Number.isSafeInteger(value.amount) &&
    "code" in value &&
    typeof value.code === "string" &&
    "paymentLinkId" in value &&
    typeof value.paymentLinkId === "string"
  );
}

async function POSTHandler(request: NextRequest) {
  try {
    const body = await readJsonBodyLimited(request, 64 * 1024);
    if (!isWebhookEnvelope(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid webhook payload" },
        { status: 400 }
      );
    }
    let verifiedData: PayOSWebhookData;
    try {
      const payload = await getPayOS().webhooks.verify(body);
      if (!isPayOSWebhookData(payload)) {
        return NextResponse.json(
          { success: false, message: "Invalid webhook payload" },
          { status: 400 }
        );
      }
      verifiedData = payload;
    } catch (error: unknown) {
      console.error(
        "PayOS webhook signature verification failed:",
        getErrorMessage(error, "Unknown signature error")
      );
      return NextResponse.json(
        { success: false, message: "Signature verification failed" },
        { status: 400 }
      );
    }

    if (verifiedData.code === "00") {
      await connectDB();
      const transaction = await Transaction.findOne({
        orderCode: verifiedData.orderCode,
      })
        .select("_id amount paymentLinkId")
        .lean();
      if (transaction) {
        if (
          transaction.amount !== verifiedData.amount ||
          (transaction.paymentLinkId &&
            transaction.paymentLinkId !== verifiedData.paymentLinkId)
        ) {
          console.error("PayOS webhook transaction mismatch", {
            orderCode: verifiedData.orderCode,
          });
          return NextResponse.json(
            { success: false, message: "Transaction data mismatch" },
            { status: 409 }
          );
        }
        await settlePaidTransaction(transaction._id, new Date());
      }
    }
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error: unknown) {
    console.error("POST /api/payment/webhook error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Payload too large" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
