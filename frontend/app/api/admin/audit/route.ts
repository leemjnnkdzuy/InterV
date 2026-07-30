import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import AdminAuditLog from "@/app/models/AdminAuditLog";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const page = Math.max(
      1,
      Math.min(10_000, Number(request.nextUrl.searchParams.get("page")) || 1)
    );
    const limit = Math.max(
      10,
      Math.min(100, Number(request.nextUrl.searchParams.get("limit")) || 30)
    );
    const action = (request.nextUrl.searchParams.get("action") || "")
      .trim()
      .slice(0, 120);
    const query = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .slice(0, 100);
    const filter: Record<string, unknown> = {};
    if (action) {
      filter.action = action;
    }
    if (query) {
      const regex = new RegExp(escapeRegExp(query), "i");
      filter.$or = [
        { summary: regex },
        { targetType: regex },
        { targetId: regex },
      ];
    }

    await connectDB();
    const [logs, total, actions] = await Promise.all([
      AdminAuditLog.find(filter)
        .populate("actorId", "username email")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(filter),
      AdminAuditLog.distinct("action"),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => {
        const actor =
          log.actorId &&
          typeof log.actorId === "object" &&
          "username" in log.actorId &&
          "email" in log.actorId
            ? log.actorId
            : null;
        return {
          id: log._id.toString(),
          actor: actor
            ? {
                username: String(actor.username),
                email: String(actor.email),
              }
            : null,
          actorRole: log.actorRole,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          summary: log.summary,
          changes: log.changes || {},
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
        };
      }),
      actions: actions.sort(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/audit error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải nhật ký quản trị" },
      { status: 500 }
    );
  }
}
