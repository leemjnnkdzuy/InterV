import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import CreditLog from "@/app/models/CreditLog";
import Transaction from "@/app/models/Transaction";
import { verifyAccessToken } from "@/app/lib/Auth";

export async function GET(request: NextRequest) {
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

    await connectDB();

    // Fetch credit logs (usage history)
    const creditLogs = await CreditLog.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch transactions (recharge history)
    const transactions = await Transaction.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      creditLogs: creditLogs.map((log: any) => ({
        id: log._id.toString(),
        credits: log.credits,
        action: log.action,
        description: log.description,
        createdAt: log.createdAt,
      })),
      transactions: transactions.map((tx: any) => ({
        id: tx._id.toString(),
        orderCode: tx.orderCode,
        amount: tx.amount,
        credits: tx.credits,
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/users/credit-history error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi lấy lịch sử. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
