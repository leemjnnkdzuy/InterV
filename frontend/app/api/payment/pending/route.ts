import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import Transaction from "@/app/models/Transaction";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/app/lib/ServerSecurity";
import {
  getPaymentExpiry,
  reconcilePayOSPayment,
  toPaymentResponse,
} from "@/app/lib/PaymentSettlement";

async function GETHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    await connectDB();
    await enforceRateLimit("payment-pending", payload.userId, 60, 10 * 60 * 1000);

    const transaction = await Transaction.findOne({
      userId: payload.userId,
      status: "PENDING",
    }).sort({ createdAt: -1 });

    if (!transaction) {
      return NextResponse.json({ success: true, paymentData: null });
    }

    const expiresAt = transaction.expiresAt || getPaymentExpiry(transaction.createdAt);
    if (expiresAt.getTime() <= Date.now()) {
      await Transaction.updateOne(
        { _id: transaction._id, status: "PENDING" },
        {
          $set: {
            status: "EXPIRED",
            providerStatus: "EXPIRED",
            expiresAt,
            lastReconciledAt: new Date(),
          },
        }
      );
      return NextResponse.json({ success: true, paymentData: null });
    }

    try {
      const reconciliation = await reconcilePayOSPayment(transaction._id);
      if (reconciliation.status !== "PENDING") {
        return NextResponse.json({ success: true, paymentData: null });
      }

      return NextResponse.json({
        success: true,
        paymentData: toPaymentResponse(transaction, reconciliation.payment),
      });
    } catch {
      // PayOS may be temporarily unavailable. Stored checkout/QR data still lets
      // the user resume the existing order without creating a duplicate one.
      if (!transaction.paymentUrl && !transaction.qrCode) {
        return NextResponse.json(
          { success: false, message: "Không thể khôi phục giao dịch đang chờ." },
          { status: 503 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentData: toPaymentResponse(transaction, {
          orderCode: transaction.orderCode,
          amount: transaction.amount,
          status: "PENDING",
          checkoutUrl: transaction.paymentUrl,
          qrCode: transaction.qrCode,
          bin: transaction.bin,
          accountNumber: transaction.accountNumber,
          accountName: transaction.accountName,
          description: transaction.description,
        }),
      });
    }
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn kiểm tra giao dịch quá thường xuyên." },
        rateLimitResponse(error)
      );
    }
    console.error("GET /api/payment/pending error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể kiểm tra giao dịch đang chờ." },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
