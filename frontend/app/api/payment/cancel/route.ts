import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import Transaction from "@/app/models/Transaction";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  PaymentIntegrityError,
  cancelPayOSPayment,
  reconcilePayOSPayment,
} from "@/app/lib/PaymentSettlement";
import {
  enforceRateLimit,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

async function POSTHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const orderCode = body.orderCode;
    if (
      typeof orderCode !== "number" ||
      !Number.isSafeInteger(orderCode) ||
      orderCode <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Mã giao dịch không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit("payment-cancel", payload.userId, 20, 10 * 60 * 1000);

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
      return NextResponse.json(
        { success: false, message: "Giao dịch đã thanh toán và không thể hủy" },
        { status: 409 }
      );
    }
    if (transaction.status === "CANCELLED" || transaction.status === "EXPIRED") {
      return NextResponse.json({
        success: true,
        status: transaction.status,
        message: "Giao dịch đã kết thúc trước đó",
      });
    }

    try {
      const result = await cancelPayOSPayment(
        transaction._id,
        "User cancelled the InterV credit transaction"
      );
      return NextResponse.json({
        success: true,
        status: result.status,
        message: "Đã hủy giao dịch thanh toán",
      });
    } catch (error: unknown) {
      if (error instanceof PaymentIntegrityError) {
        return NextResponse.json(
          { success: false, message: "Không thể xác nhận việc hủy giao dịch PayOS" },
          { status: 409 }
        );
      }

      // A cancellation race can mean PayOS has already transitioned the order.
      // Reconcile once before returning an error to the user.
      try {
        const reconciliation = await reconcilePayOSPayment(transaction._id);
        if (reconciliation.status !== "PENDING") {
          return NextResponse.json({
            success: true,
            status: reconciliation.status,
            message: "Giao dịch đã được cập nhật theo trạng thái PayOS",
          });
        }
      } catch {
        // Preserve the original failure below.
      }
      throw error;
    }
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn thao tác quá thường xuyên." },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu hủy giao dịch quá lớn" },
        { status: 413 }
      );
    }
    console.error("POST /api/payment/cancel error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể hủy giao dịch. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
