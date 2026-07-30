import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  PaymentIntegrityError,
  reconcilePayOSPayment,
} from "@/app/lib/PaymentSettlement";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
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

    await connectDB();
    await enforceRateLimit(
      "admin:payment-reconcile",
      actor.payload.userId,
      100,
      60 * 60 * 1000
    );
    const before = await Transaction.findById(transactionId)
      .select("orderCode status providerStatus")
      .lean();
    if (!before) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giao dịch" },
        { status: 404 }
      );
    }
    const result = await reconcilePayOSPayment(before._id);
    await recordAdminAudit({
      request,
      actorId: actor.payload.userId,
      actorRole: actor.user.role,
      action: "PAYMENT_RECONCILED",
      targetType: "Transaction",
      targetId: transactionId,
      summary: `Đối soát giao dịch PayOS #${before.orderCode}`,
      changes: {
        previousStatus: before.status,
        previousProviderStatus: before.providerStatus,
        status: result.status,
        providerStatus: result.providerStatus,
      },
    });
    return NextResponse.json({
      success: true,
      message: "Đã đối soát giao dịch với PayOS",
      result,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đối soát quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof PaymentIntegrityError) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu PayOS không khớp. Hệ thống đã chặn cộng credits.",
        },
        { status: 409 }
      );
    }
    console.error(
      "POST /api/admin/payments/[transactionId]/reconcile error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Không thể đối soát giao dịch" },
      { status: 502 }
    );
  }
}
