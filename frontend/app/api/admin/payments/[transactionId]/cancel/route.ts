import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  cancelPayOSPayment,
  PaymentIntegrityError,
} from "@/app/lib/PaymentSettlement";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import Transaction from "@/app/models/Transaction";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const actor = authorization.principal;
    const { transactionId } = await params;
    if (!mongoose.isValidObjectId(transactionId)) {
      return NextResponse.json(
        { success: false, message: "ID giao dịch không hợp lệ" },
        { status: 400 }
      );
    }
    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 5 || reason.length > 500) {
      return NextResponse.json(
        { success: false, message: "Lý do hủy phải từ 5 đến 500 ký tự" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "admin:payment-cancel",
      actor.payload.userId,
      50,
      60 * 60 * 1000
    );
    const transaction = await Transaction.findById(transactionId)
      .select("orderCode status")
      .lean();
    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giao dịch" },
        { status: 404 }
      );
    }
    const result = await cancelPayOSPayment(transaction._id, reason);
    await recordAdminAudit({
      request,
      actorId: actor.payload.userId,
      actorRole: actor.user.role,
      action: "PAYMENT_CANCELLED",
      targetType: "Transaction",
      targetId: transactionId,
      summary: `Hủy giao dịch PayOS #${transaction.orderCode}`,
      changes: {
        previousStatus: transaction.status,
        status: result.status,
        providerStatus: result.providerStatus,
        reason,
      },
    });
    return NextResponse.json({
      success: true,
      message: "Đã hủy giao dịch trên PayOS",
      result,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn thao tác quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu hủy quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof PaymentIntegrityError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu PayOS không khớp" },
        { status: 409 }
      );
    }
    if (
      error instanceof Error &&
      error.message === "TRANSACTION_ALREADY_PAID"
    ) {
      return NextResponse.json(
        { success: false, message: "Không thể hủy giao dịch đã thanh toán" },
        { status: 409 }
      );
    }
    console.error(
      "POST /api/admin/payments/[transactionId]/cancel error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Không thể hủy giao dịch" },
      { status: 502 }
    );
  }
}
