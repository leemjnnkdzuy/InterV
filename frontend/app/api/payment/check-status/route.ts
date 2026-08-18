import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import Transaction from "@/app/models/Transaction";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  PaymentIntegrityError,
  getPaymentExpiry,
  reconcilePayOSPayment,
} from "@/app/lib/PaymentSettlement";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/app/lib/ServerSecurity";

async function GETHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const orderCode = Number(request.nextUrl.searchParams.get("orderCode"));
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
      return NextResponse.json(
        { success: false, message: "Mã giao dịch không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit("payment-status", payload.userId, 120, 10 * 60 * 1000);

    const transaction = await Transaction.findOne({
      orderCode,
      userId: payload.userId,
    });
    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Giao dịch không tồn tại" },
        { status: 404 }
      );
    }

    if (transaction.status === "PAID") {
      const user = await User.findById(payload.userId).select("credits").lean();
      return NextResponse.json({
        success: true,
        status: "PAID",
        paidAt: transaction.paidAt,
        credits: transaction.credits,
        balance: user?.credits ?? 0,
      });
    }

    if (transaction.status === "CANCELLED" || transaction.status === "EXPIRED") {
      return NextResponse.json({
        success: true,
        status: transaction.status,
        providerStatus: transaction.providerStatus,
      });
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
      return NextResponse.json({ success: true, status: "EXPIRED" });
    }

    try {
      const reconciliation = await reconcilePayOSPayment(transaction._id);
      if (reconciliation.status === "PAID") {
        const [user, settledTransaction] = await Promise.all([
          User.findById(payload.userId).select("credits").lean(),
          Transaction.findById(transaction._id).select("paidAt").lean(),
        ]);
        return NextResponse.json({
          success: true,
          status: "PAID",
          providerStatus: reconciliation.providerStatus,
          paidAt: settledTransaction?.paidAt,
          credits: transaction.credits,
          balance: user?.credits ?? 0,
        });
      }

      return NextResponse.json({
        success: true,
        status: reconciliation.status,
        providerStatus: reconciliation.providerStatus,
      });
    } catch (error: unknown) {
      if (error instanceof PaymentIntegrityError) {
        return NextResponse.json(
          {
            success: false,
            message: "Dữ liệu đối soát PayOS không khớp. Giao dịch chưa được cộng credits.",
          },
          { status: 409 }
        );
      }

      // Polling should tolerate a temporary provider outage and keep the order
      // resumable instead of turning a still-valid payment into a failure.
      return NextResponse.json({
        success: true,
        status: "PENDING",
        providerStatus: transaction.providerStatus,
      });
    }
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn kiểm tra giao dịch quá thường xuyên." },
        rateLimitResponse(error)
      );
    }
    console.error("GET /api/payment/check-status error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể kiểm tra trạng thái thanh toán." },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
