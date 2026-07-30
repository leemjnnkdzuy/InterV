import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import Transaction from "@/app/models/Transaction";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  PaymentIntegrityError,
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
    await enforceRateLimit("payment-verify", payload.userId, 30, 10 * 60_000);
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
      return NextResponse.json({
        success: true,
        message: "Giao dịch đã được xử lý trước đó",
        status: "PAID",
      });
    }

    const reconciliation = await reconcilePayOSPayment(transaction._id);
    if (reconciliation.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Giao dịch đã được cộng credits thành công",
        status: "PAID",
      });
    }
    if (reconciliation.status === "CANCELLED") {
      return NextResponse.json({
        success: true,
        message: "Giao dịch đã bị hủy bỏ",
        status: "CANCELLED",
        providerStatus: reconciliation.providerStatus,
      });
    }
    return NextResponse.json({
      success: true,
      message: "Giao dịch đang chờ thanh toán",
      status: "PENDING",
      providerStatus: reconciliation.providerStatus,
    });
  } catch (error: unknown) {
    console.error("POST /api/payment/verify error:", error);
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đang kiểm tra giao dịch quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu xác minh giao dịch quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof PaymentIntegrityError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu đối soát PayOS không khớp. Giao dịch chưa được cộng credits.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi kiểm tra giao dịch. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
