import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Transaction from "@/app/models/Transaction";
import { authenticateRequest } from "@/app/lib/Auth";
import { getPayOS } from "@/app/lib/PayOS";
import { RECHARGE_PACKAGES } from "@/app/contants";
import { getErrorMessage } from "@/app/lib/Utils";
import {
  createOrderCode,
  getApplicationOrigin,
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
        { success: false, message: "Access token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const { amount } = body;

    if (!amount || typeof amount !== "number") {
      return NextResponse.json(
        { success: false, message: "Số tiền nạp không hợp lệ" },
        { status: 400 }
      );
    }

    const matchedPkg = RECHARGE_PACKAGES.find((pkg) => pkg.amount === amount);
    if (!matchedPkg) {
      return NextResponse.json(
        { success: false, message: "Gói nạp không tồn tại" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "payment-create",
      payload.userId,
      10,
      10 * 60 * 1000
    );
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const orderCode = createOrderCode();
    const totalCredits = matchedPkg.credit + matchedPkg.bonus;

    const appUrl = getApplicationOrigin();
    const returnUrl = `${appUrl}/credit?status=success&orderCode=${orderCode}`;
    const cancelUrl = `${appUrl}/credit?status=cancel`;

    const transaction = await Transaction.create({
      userId: user._id,
      orderCode,
      amount,
      credits: totalCredits,
      status: "PENDING",
      providerStatus: "PENDING",
      paymentLinkId: "",
    });
    let paymentUrl: string;
    try {
      const paymentLinkData = await getPayOS().paymentRequests.create({
        orderCode,
        amount,
        description: `NAP ${totalCredits} CREDIT`,
        cancelUrl,
        returnUrl,
      });
      paymentUrl = paymentLinkData.checkoutUrl;
      await Transaction.updateOne(
        { _id: transaction._id },
        {
          $set: {
            paymentLinkId: paymentLinkData.paymentLinkId,
            paymentUrl,
            providerStatus: paymentLinkData.status,
          },
        }
      );
    } catch (error) {
      await Transaction.updateOne(
        { _id: transaction._id, status: "PENDING" },
        {
          $set: {
            status: "CANCELLED",
            providerStatus: "FAILED",
            cancelledAt: new Date(),
            cancellationReason: "Không thể tạo liên kết thanh toán PayOS",
          },
        }
      );
      throw error;
    }

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderCode,
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn tạo quá nhiều giao dịch. Vui lòng thử lại sau.",
        },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu tạo giao dịch quá lớn" },
        { status: 413 }
      );
    }
    console.error(
      "POST /api/payment/create error:",
      getErrorMessage(error, "Unknown PayOS error").slice(0, 500)
    );
    return NextResponse.json(
      {
        success: false,
        message: "Lỗi tạo link thanh toán. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
