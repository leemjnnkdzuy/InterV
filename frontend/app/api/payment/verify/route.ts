import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Transaction from "@/app/models/Transaction";
import CreditLog from "@/app/models/CreditLog";
import { verifyAccessToken } from "@/app/lib/Auth";
import payos from "@/app/lib/PayOS";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy access token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Access token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderCode, mock } = body;

    if (!orderCode) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã giao dịch (orderCode)" },
        { status: 400 }
      );
    }

    await connectDB();
    const transaction = await Transaction.findOne({ orderCode });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Giao dịch không tồn tại" },
        { status: 404 }
      );
    }

    if (transaction.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Giao dịch đã được thanh toán và xử lý thành công trước đó",
        status: "PAID",
      });
    }

    let paymentStatus = "PENDING";

    // Handle mock transactions or mock parameter
    if (mock || transaction.paymentLinkId.startsWith("MOCK_")) {
      paymentStatus = "PAID";
    } else {
      try {
        const paymentInfo = await payos.paymentRequests.get(orderCode);
        paymentStatus = paymentInfo.status; // "PENDING", "PAID", "CANCELLED", etc.
      } catch (payosError: any) {
        console.error(`Error querying status for orderCode ${orderCode}:`, payosError.message || payosError);
        // Fallback to check if mock transaction
        if (transaction.paymentLinkId.startsWith("MOCK_")) {
          paymentStatus = "PAID";
        }
      }
    }

    if (paymentStatus === "PAID" || paymentStatus === "completed") {
      // Perform atomic database update to prevent double spending
      const updatedTransaction = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: "PENDING" },
        { $set: { status: "PAID" } },
        { returnDocument: 'after' }
      );

      if (updatedTransaction) {
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
          description: `Nạp thành công ${transaction.credits} Credits qua PayOS (Giao dịch #${transaction.orderCode})`,
        });

        return NextResponse.json({
          success: true,
          message: "Giao dịch đã được xử lý và cộng tiền thành công!",
          status: "PAID",
        });
      }
    } else if (paymentStatus === "CANCELLED" || paymentStatus === "cancelled") {
      await Transaction.updateOne(
        { _id: transaction._id, status: "PENDING" },
        { $set: { status: "CANCELLED" } }
      );
      return NextResponse.json({
        success: true,
        message: "Giao dịch đã bị hủy bỏ",
        status: "CANCELLED",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Giao dịch đang chờ thanh toán",
      status: "PENDING",
    });
  } catch (error: any) {
    console.error("POST /api/payment/verify error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi kiểm tra giao dịch. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
