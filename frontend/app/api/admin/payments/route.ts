import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import Transaction from "@/app/models/Transaction";
import User from "@/app/models/User";

const LOCAL_STATUSES = new Set(["PENDING", "PAID", "CANCELLED", "EXPIRED"]);
const PROVIDER_STATUSES = new Set([
  "PENDING",
  "CANCELLED",
  "UNDERPAID",
  "PAID",
  "EXPIRED",
  "PROCESSING",
  "FAILED",
]);
const ALLOWED_DAYS = new Set([7, 30, 90, 365]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function integerParam(value: string | null, fallback: number): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function populatedUser(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("_id" in value) ||
    !("username" in value) ||
    !("email" in value)
  ) {
    return null;
  }
  return {
    id: String(value._id),
    username: String(value.username),
    email: String(value.email),
  };
}

function safePaymentUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function GETHandler(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const params = request.nextUrl.searchParams;
    const requestedDays = integerParam(params.get("days"), 30);
    const days = ALLOWED_DAYS.has(requestedDays) ? requestedDays : 30;
    const page = Math.min(integerParam(params.get("page"), 1), 10_000);
    const limit = Math.min(integerParam(params.get("limit"), 20), 100);
    const status = (params.get("status") || "").toUpperCase();
    const providerStatus = (
      params.get("providerStatus") || ""
    ).toUpperCase();
    const query = (params.get("q") || "").trim().slice(0, 100);
    if (
      (status && !LOCAL_STATUSES.has(status)) ||
      (providerStatus && !PROVIDER_STATUSES.has(providerStatus))
    ) {
      return NextResponse.json(
        { success: false, message: "Bộ lọc thanh toán không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rangeMatch = { createdAt: { $gte: from } };
    const filter: Record<string, unknown> = { ...rangeMatch };
    if (status) filter.status = status;
    if (providerStatus) filter.providerStatus = providerStatus;
    if (query) {
      const regex = new RegExp(escapeRegExp(query), "i");
      const users = await User.find({
        $or: [{ username: regex }, { email: regex }],
      })
        .select("_id")
        .limit(100)
        .lean();
      const alternatives: Record<string, unknown>[] = [
        { userId: { $in: users.map((user) => user._id) } },
      ];
      if (/^\d{1,15}$/.test(query)) {
        alternatives.push({ orderCode: Number(query) });
      }
      filter.$or = alternatives;
    }

    const [summaryRows, trend, transactions, total] = await Promise.all([
      Transaction.aggregate<{
        _id: null;
        transactions: number;
        paidTransactions: number;
        pendingTransactions: number;
        cancelledTransactions: number;
        revenueVnd: number;
        creditsSold: number;
        pendingVnd: number;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: null,
            transactions: { $sum: 1 },
            paidTransactions: {
              $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] },
            },
            pendingTransactions: {
              $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
            },
            cancelledTransactions: {
              $sum: {
                $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0],
              },
            },
            revenueVnd: {
              $sum: {
                $cond: [{ $eq: ["$status", "PAID"] }, "$amount", 0],
              },
            },
            creditsSold: {
              $sum: {
                $cond: [{ $eq: ["$status", "PAID"] }, "$credits", 0],
              },
            },
            pendingVnd: {
              $sum: {
                $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
      Transaction.aggregate<{
        _id: string;
        revenueVnd: number;
        paid: number;
        created: number;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
            revenueVnd: {
              $sum: {
                $cond: [{ $eq: ["$status", "PAID"] }, "$amount", 0],
              },
            },
            paid: {
              $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] },
            },
            created: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Transaction.find(filter)
        .select(
          "userId orderCode amount credits status providerStatus paymentLinkId paymentUrl paidAt cancelledAt lastReconciledAt cancellationReason reconciliationError createdAt updatedAt"
        )
        .populate("userId", "username email")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    const summary = summaryRows[0] || {
      transactions: 0,
      paidTransactions: 0,
      pendingTransactions: 0,
      cancelledTransactions: 0,
      revenueVnd: 0,
      creditsSold: 0,
      pendingVnd: 0,
    };

    return NextResponse.json({
      success: true,
      range: { days, from, to: new Date() },
      metrics: {
        ...summary,
        conversionRate:
          summary.transactions > 0
            ? (summary.paidTransactions / summary.transactions) * 100
            : 0,
      },
      trend: trend.map((item) => ({
        date: item._id,
        revenueVnd: item.revenueVnd,
        paid: item.paid,
        created: item.created,
      })),
      transactions: transactions.map((transaction) => ({
        id: transaction._id.toString(),
        user: populatedUser(transaction.userId),
        orderCode: transaction.orderCode,
        amount: transaction.amount,
        credits: transaction.credits,
        status: transaction.status,
        providerStatus: transaction.providerStatus || transaction.status,
        paymentLinkId: transaction.paymentLinkId,
        paymentUrl: safePaymentUrl(transaction.paymentUrl),
        paidAt: transaction.paidAt,
        cancelledAt: transaction.cancelledAt,
        lastReconciledAt: transaction.lastReconciledAt,
        cancellationReason: transaction.cancellationReason,
        reconciliationError: transaction.reconciliationError,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/payments error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải dữ liệu thanh toán" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
