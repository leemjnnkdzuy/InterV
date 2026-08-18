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
  getPaymentExpiry,
  getApplicationOrigin,
  reconcilePayOSPayment,
  toPaymentResponse,
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
    const packageId = typeof body.packageId === "string" ? body.packageId.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : null;
    const matchedPkg = packageId
      ? RECHARGE_PACKAGES.find((pkg) => pkg.id === packageId)
      : amount !== null
        ? RECHARGE_PACKAGES.find((pkg) => pkg.amount === amount)
        : undefined;
    if (!matchedPkg) {
      return NextResponse.json(
        { success: false, message: "Gói nạp không tồn tại hoặc không hợp lệ" },
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

    const existingPending = await Transaction.findOne({
      userId: payload.userId,
      status: "PENDING",
    }).sort({ createdAt: -1 });

    if (existingPending) {
      if (
        existingPending.expiresAt &&
        existingPending.expiresAt.getTime() <= Date.now()
      ) {
        await Transaction.updateOne(
          { _id: existingPending._id, status: "PENDING" },
          {
            $set: {
              status: "EXPIRED",
              providerStatus: "EXPIRED",
              lastReconciledAt: new Date(),
            },
          }
        );
      } else {
        try {
          const reconciliation = await reconcilePayOSPayment(existingPending._id);
          if (reconciliation.status === "PENDING") {
            return NextResponse.json(
              {
                success: false,
                code: "PAYMENT_PENDING",
                orderCode: existingPending.orderCode,
                message: "Bạn đang có một giao dịch thanh toán chưa hoàn tất.",
              },
              { status: 409 }
            );
          }
        } catch {
          return NextResponse.json(
            {
              success: false,
              code: "PAYMENT_PENDING",
              orderCode: existingPending.orderCode,
              message: "Không thể tạo giao dịch mới khi còn giao dịch đang chờ xử lý.",
            },
            { status: 409 }
          );
        }
      }
    }

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
    const cancelUrl = `${appUrl}/credit?status=cancel&orderCode=${orderCode}`;
    const createdAt = new Date();
    const expiresAt = getPaymentExpiry(createdAt);

    const transaction = await Transaction.create({
      userId: user._id,
      orderCode,
      packageId: matchedPkg.id,
      amount: matchedPkg.amount,
      credits: totalCredits,
      status: "PENDING",
      providerStatus: "PENDING",
      paymentLinkId: "",
      createdAt,
      expiresAt,
    });
    try {
      const paymentLinkData = await getPayOS().paymentRequests.create({
        orderCode,
        amount: matchedPkg.amount,
        description: `NAP ${totalCredits} CREDIT`,
        cancelUrl,
        returnUrl,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
      });
      const persistedExpiresAt = paymentLinkData.expiredAt
        ? new Date(paymentLinkData.expiredAt * 1000)
        : expiresAt;
      await Transaction.updateOne(
        { _id: transaction._id },
        {
          $set: {
            paymentLinkId: paymentLinkData.paymentLinkId,
            paymentUrl: paymentLinkData.checkoutUrl,
            qrCode: paymentLinkData.qrCode,
            bin: paymentLinkData.bin,
            accountNumber: paymentLinkData.accountNumber,
            accountName: paymentLinkData.accountName,
            description: paymentLinkData.description,
            providerStatus: paymentLinkData.status,
            expiresAt: persistedExpiresAt,
          },
        }
      );
      return NextResponse.json(
        toPaymentResponse(
          {
            orderCode,
            packageId: matchedPkg.id,
            amount: matchedPkg.amount,
            credits: totalCredits,
            createdAt,
            expiresAt: persistedExpiresAt,
            paymentUrl: paymentLinkData.checkoutUrl,
            qrCode: paymentLinkData.qrCode,
            bin: paymentLinkData.bin,
            accountNumber: paymentLinkData.accountNumber,
            accountName: paymentLinkData.accountName,
            description: paymentLinkData.description,
          },
          paymentLinkData
        )
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
