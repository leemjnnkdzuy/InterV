import { withApiLogging } from "@/app/lib/ApiLogging";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import CreditLog from "@/app/models/CreditLog";
import User from "@/app/models/User";

const ACTIONS = new Set([
  "RECHARGE",
  "AI_INTERVIEW",
  "AI_INTERVIEW_REFUND",
  "AI_JD_EXTRACT",
  "REGISTER_BONUS",
  "ADMIN_ADJUST",
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
    balance: "credits" in value ? Number(value.credits || 0) : 0,
  };
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
    const action = (params.get("action") || "").toUpperCase();
    const query = (params.get("q") || "").trim().slice(0, 100);
    if (action && !ACTIONS.has(action)) {
      return NextResponse.json(
        { success: false, message: "Bộ lọc credit không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rangeMatch = { createdAt: { $gte: from } };
    const filter: Record<string, unknown> = { ...rangeMatch };
    if (action) filter.action = action;
    if (query) {
      const regex = new RegExp(escapeRegExp(query), "i");
      const users = await User.find({
        $or: [{ username: regex }, { email: regex }],
      })
        .select("_id")
        .limit(100)
        .lean();
      filter.$or = [
        { userId: { $in: users.map((user) => user._id) } },
        { referenceId: regex },
      ];
    }

    const [summaryRows, balanceRows, logs, total] = await Promise.all([
      CreditLog.aggregate<{
        _id: null;
        entries: number;
        issuedCredits: number;
        consumedCredits: number;
        rechargeCredits: number;
        adminNetCredits: number;
        refundedCredits: number;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: null,
            entries: { $sum: 1 },
            issuedCredits: {
              $sum: { $cond: [{ $gt: ["$credits", 0] }, "$credits", 0] },
            },
            consumedCredits: {
              $sum: {
                $cond: [
                  { $lt: ["$credits", 0] },
                  { $abs: "$credits" },
                  0,
                ],
              },
            },
            rechargeCredits: {
              $sum: {
                $cond: [{ $eq: ["$action", "RECHARGE"] }, "$credits", 0],
              },
            },
            adminNetCredits: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "ADMIN_ADJUST"] },
                  "$credits",
                  0,
                ],
              },
            },
            refundedCredits: {
              $sum: {
                $cond: [
                  { $eq: ["$action", "AI_INTERVIEW_REFUND"] },
                  "$credits",
                  0,
                ],
              },
            },
          },
        },
      ]),
      User.aggregate<{ _id: null; totalBalance: number; users: number }>([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$credits" },
            users: { $sum: 1 },
          },
        },
      ]),
      CreditLog.find(filter)
        .select(
          "userId credits action description referenceId metadata createdAt"
        )
        .populate("userId", "username email credits")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CreditLog.countDocuments(filter),
    ]);
    const summary = summaryRows[0] || {
      entries: 0,
      issuedCredits: 0,
      consumedCredits: 0,
      rechargeCredits: 0,
      adminNetCredits: 0,
      refundedCredits: 0,
    };

    return NextResponse.json({
      success: true,
      range: { days, from, to: new Date() },
      metrics: {
        ...summary,
        totalUserBalance: balanceRows[0]?.totalBalance || 0,
        users: balanceRows[0]?.users || 0,
      },
      logs: logs.map((log) => ({
        id: log._id.toString(),
        user: populatedUser(log.userId),
        credits: log.credits,
        action: log.action,
        description: log.description,
        referenceId: log.referenceId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/credits error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải sổ credit" },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const actor = authorization.principal;
    const body = (await readJsonBodyLimited(
      request,
      8 * 1024
    )) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    const credits = Number(body.credits);
    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";
    const idempotencyKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";
    if (
      !mongoose.isValidObjectId(userId) ||
      !Number.isSafeInteger(credits) ||
      credits === 0 ||
      Math.abs(credits) > 1_000_000 ||
      reason.length < 10 ||
      reason.length > 500 ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey)
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu điều chỉnh credit không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "admin:credit-adjust",
      actor.payload.userId,
      50,
      60 * 60 * 1000
    );
    const referenceId = `admin-adjust:${idempotencyKey}`;
    const dbSession = await mongoose.startSession();
    let updatedUser:
      | { id: string; username: string; email: string; credits: number }
      | undefined;
    let idempotentReplay = false;
    try {
      await dbSession.withTransaction(async () => {
        const existing = await CreditLog.findOne({
          action: "ADMIN_ADJUST",
          referenceId,
        }).session(dbSession);
        if (existing) {
          if (
            existing.userId.toString() !== userId ||
            existing.credits !== credits ||
            existing.description !== reason
          ) {
            throw new Error("IDEMPOTENCY_CONFLICT");
          }
          const user = await User.findById(userId)
            .select("username email credits")
            .session(dbSession);
          if (!user) throw new Error("USER_NOT_FOUND");
          updatedUser = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            credits: user.credits,
          };
          idempotentReplay = true;
          return;
        }

        const balanceFilter: Record<string, unknown> = { _id: userId };
        if (credits < 0) {
          balanceFilter.credits = { $gte: Math.abs(credits) };
        }
        const user = await User.findOneAndUpdate(
          balanceFilter,
          { $inc: { credits } },
          {
            returnDocument: "after",
            runValidators: true,
            session: dbSession,
          }
        ).select("username email credits");
        if (!user) {
          const exists = await User.exists({ _id: userId }).session(
            dbSession
          );
          throw new Error(
            exists ? "INSUFFICIENT_CREDITS" : "USER_NOT_FOUND"
          );
        }
        await CreditLog.create(
          [
            {
              userId: user._id,
              credits,
              action: "ADMIN_ADJUST",
              description: reason,
              referenceId,
              metadata: {
                actorId: actor.payload.userId,
                balanceAfter: user.credits,
              },
            },
          ],
          { session: dbSession }
        );
        await recordAdminAudit({
          request,
          actorId: actor.payload.userId,
          actorRole: actor.user.role,
          action: "USER_CREDITS_ADJUSTED",
          targetType: "User",
          targetId: user._id.toString(),
          summary: `Điều chỉnh ${credits > 0 ? "+" : ""}${credits} credits cho ${user.username}`,
          changes: {
            credits,
            balanceAfter: user.credits,
            reason,
            referenceId,
          },
          session: dbSession,
        });
        updatedUser = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          credits: user.credits,
        };
      });
    } finally {
      await dbSession.endSession();
    }

    return NextResponse.json({
      success: true,
      message: idempotentReplay
        ? "Yêu cầu này đã được xử lý trước đó"
        : "Đã điều chỉnh credit",
      user: updatedUser,
      idempotentReplay,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn điều chỉnh credit quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu điều chỉnh quá lớn" },
        { status: 413 }
      );
    }
    const code = error instanceof Error ? error.message : "";
    const mapped: Record<string, [string, number]> = {
      USER_NOT_FOUND: ["Không tìm thấy người dùng", 404],
      INSUFFICIENT_CREDITS: [
        "Số dư người dùng không đủ cho điều chỉnh này",
        409,
      ],
      IDEMPOTENCY_CONFLICT: [
        "Mã idempotency đã được dùng cho một điều chỉnh khác",
        409,
      ],
    };
    if (mapped[code]) {
      return NextResponse.json(
        { success: false, message: mapped[code][0] },
        { status: mapped[code][1] }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Yêu cầu điều chỉnh đang được xử lý, vui lòng tải lại",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/admin/credits error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể điều chỉnh credit" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
export const POST = withApiLogging(POSTHandler);
