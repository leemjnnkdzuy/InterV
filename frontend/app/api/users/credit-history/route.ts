import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import connectDB from "@/app/lib/ConnectDB";
import CreditLog from "@/app/models/CreditLog";
import Transaction from "@/app/models/Transaction";
import { authenticateRequest } from "@/app/lib/Auth";
import type { ICreditLog, ITransaction } from "@/app/types";

interface LeanCreditLog {
  _id: Types.ObjectId;
  credits: number;
  action: ICreditLog["action"];
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface LeanTransaction {
  _id: Types.ObjectId;
  orderCode: number;
  amount: number;
  credits: number;
  status: ITransaction["status"];
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
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
      .limit(100)
      .lean<LeanCreditLog[]>();

    // Fetch transactions (recharge history)
    const transactions = await Transaction.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean<LeanTransaction[]>();

    return NextResponse.json({
      success: true,
      creditLogs: creditLogs.map((log) => ({
        id: log._id.toString(),
        credits: log.credits,
        action: log.action,
        description: log.description,
        referenceId: log.referenceId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      transactions: transactions.map((tx) => ({
        id: tx._id.toString(),
        orderCode: tx.orderCode,
        amount: tx.amount,
        credits: tx.credits,
        status: tx.status,
        createdAt: tx.createdAt,
      })),
    });
  } catch (error: unknown) {
    console.error("GET /api/users/credit-history error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi lấy lịch sử. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
