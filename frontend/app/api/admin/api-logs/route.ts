import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import {
  getApiLogSettings,
  invalidateApiLogSettingsCache,
  API_LOG_RETENTION_DAYS,
  withApiLogging,
} from "@/app/lib/ApiLogging";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import connectEventDB from "@/app/lib/ConnectEventDB";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import { getApiLogSettingModel } from "@/app/models/ApiLogSetting";
import { getApiRequestLogModel } from "@/app/models/ApiRequestLog";
import User from "@/app/models/User";

const ALLOWED_DAYS = new Set([1, 7]);
const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);
const ALLOWED_OUTCOMES = new Set([
  "SUCCESS",
  "CLIENT_ERROR",
  "SERVER_ERROR",
  "UNHANDLED_ERROR",
]);

function integerParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const requestedDays = integerParam(params.get("days"), 7);
    const days = ALLOWED_DAYS.has(requestedDays) ? requestedDays : 7;
    const page = Math.min(integerParam(params.get("page"), 1), 10_000);
    const limit = Math.min(integerParam(params.get("limit"), 30), 100);
    const method = (params.get("method") || "").trim().toUpperCase();
    const outcome = (params.get("outcome") || "").trim().toUpperCase();
    const routeGroup = (params.get("group") || "")
      .trim()
      .toLowerCase()
      .slice(0, 80);
    const slow = (params.get("slow") || "").trim().toLowerCase();
    const query = (params.get("q") || "").trim().slice(0, 120);
    if (
      (method && !ALLOWED_METHODS.has(method)) ||
      (outcome && !ALLOWED_OUTCOMES.has(outcome)) ||
      (routeGroup && !/^[a-z0-9_-]{1,80}$/.test(routeGroup)) ||
      (slow && slow !== "true" && slow !== "false")
    ) {
      return NextResponse.json(
        { success: false, message: "Bộ lọc không hợp lệ" },
        { status: 400 }
      );
    }

    await Promise.all([connectDB(), connectEventDB()]);
    const ApiRequestLog = getApiRequestLogModel();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
    const filter: Record<string, unknown> = {
      createdAt: { $gte: from },
    };
    if (method) filter.method = method;
    if (outcome) filter.outcome = outcome;
    if (routeGroup) filter.routeGroup = routeGroup;
    if (slow) filter.isSlow = slow === "true";
    if (query) {
      const regex = new RegExp(escapeRegExp(query), "i");
      filter.$or = [{ path: regex }, { requestId: regex }];
    }

    const [
      summaryRows,
      trend,
      topRoutes,
      statusBreakdown,
      logs,
      total,
      groups,
      settings,
    ] = await Promise.all([
      ApiRequestLog.aggregate<{
        _id: null;
        requests: number;
        successful: number;
        clientErrors: number;
        serverErrors: number;
        slowRequests: number;
        averageDurationMs: number;
        maxDurationMs: number;
      }>([
        { $match: filter },
        {
          $group: {
            _id: null,
            requests: { $sum: 1 },
            successful: {
              $sum: { $cond: [{ $eq: ["$outcome", "SUCCESS"] }, 1, 0] },
            },
            clientErrors: {
              $sum: {
                $cond: [{ $eq: ["$outcome", "CLIENT_ERROR"] }, 1, 0],
              },
            },
            serverErrors: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$outcome",
                      ["SERVER_ERROR", "UNHANDLED_ERROR"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            slowRequests: {
              $sum: { $cond: ["$isSlow", 1, 0] },
            },
            averageDurationMs: { $avg: "$durationMs" },
            maxDurationMs: { $max: "$durationMs" },
          },
        },
      ]),
      ApiRequestLog.aggregate<{
        _id: string;
        requests: number;
        errors: number;
        slowRequests: number;
        averageDurationMs: number;
      }>([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [
                  { $ne: ["$outcome", "SUCCESS"] },
                  1,
                  0,
                ],
              },
            },
            slowRequests: {
              $sum: { $cond: ["$isSlow", 1, 0] },
            },
            averageDurationMs: { $avg: "$durationMs" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ApiRequestLog.aggregate<{
        _id: string;
        requests: number;
        errors: number;
        averageDurationMs: number;
        maxDurationMs: number;
      }>([
        { $match: filter },
        {
          $group: {
            _id: "$path",
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [
                  { $ne: ["$outcome", "SUCCESS"] },
                  1,
                  0,
                ],
              },
            },
            averageDurationMs: { $avg: "$durationMs" },
            maxDurationMs: { $max: "$durationMs" },
          },
        },
        { $sort: { requests: -1, averageDurationMs: -1 } },
        { $limit: 8 },
      ]),
      ApiRequestLog.aggregate<{ _id: number; requests: number }>([
        { $match: filter },
        {
          $group: {
            _id: "$statusCode",
            requests: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ApiRequestLog.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ApiRequestLog.countDocuments(filter),
      ApiRequestLog.distinct("routeGroup", {
        createdAt: { $gte: from },
      }),
      getApiLogSettings(),
    ]);

    const percentileIndex =
      total > 0 ? Math.max(0, Math.ceil(total * 0.95) - 1) : 0;
    const actorIds = Array.from(
      new Set(
        logs
          .map((log) => log.actorId?.toString())
          .filter((value): value is string => Boolean(value))
      )
    );
    const [percentileRow, actors] = await Promise.all([
      total > 0
        ? ApiRequestLog.findOne(filter)
            .select("durationMs")
            .sort({ durationMs: 1, _id: 1 })
            .skip(percentileIndex)
            .lean()
        : null,
      actorIds.length > 0
        ? User.find({ _id: { $in: actorIds } })
            .select("username email role")
            .lean()
        : [],
    ]);
    const actorById = new Map(
      actors.map((actor) => [
        actor._id.toString(),
        {
          username: actor.username,
          email: actor.email,
          role: actor.role,
        },
      ])
    );
    const summary = summaryRows[0] || {
      requests: 0,
      successful: 0,
      clientErrors: 0,
      serverErrors: 0,
      slowRequests: 0,
      averageDurationMs: 0,
      maxDurationMs: 0,
    };
    const errors = summary.clientErrors + summary.serverErrors;

    return NextResponse.json({
      success: true,
      range: { days, from, to: new Date() },
      metrics: {
        ...summary,
        averageDurationMs: Math.round(
          (summary.averageDurationMs || 0) * 100
        ) / 100,
        maxDurationMs:
          Math.round((summary.maxDurationMs || 0) * 100) / 100,
        p95DurationMs:
          Math.round((percentileRow?.durationMs || 0) * 100) / 100,
        errorRate:
          summary.requests > 0 ? (errors / summary.requests) * 100 : 0,
      },
      trend: trend.map((item) => ({
        date: item._id,
        requests: item.requests,
        errors: item.errors,
        slowRequests: item.slowRequests,
        averageDurationMs:
          Math.round((item.averageDurationMs || 0) * 100) / 100,
      })),
      topRoutes: topRoutes.map((item) => ({
        path: item._id,
        requests: item.requests,
        errors: item.errors,
        averageDurationMs:
          Math.round((item.averageDurationMs || 0) * 100) / 100,
        maxDurationMs:
          Math.round((item.maxDurationMs || 0) * 100) / 100,
      })),
      statusBreakdown: statusBreakdown.map((item) => ({
        statusCode: item._id,
        requests: item.requests,
      })),
      logs: logs.map((log) => ({
        id: log._id.toString(),
        requestId: log.requestId,
        source: log.source,
        method: log.method,
        path: log.path,
        routeGroup: log.routeGroup,
        queryKeys: log.queryKeys,
        statusCode: log.statusCode,
        durationMs: log.durationMs,
        outcome: log.outcome,
        isSlow: log.isSlow,
        actor: log.actorId
          ? actorById.get(log.actorId.toString()) || null
          : null,
        sessionId: log.sessionId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        requestSizeBytes: log.requestSizeBytes,
        responseSizeBytes: log.responseSizeBytes,
        retryAfterSeconds: log.retryAfterSeconds,
        errorType: log.errorType,
        createdAt: log.createdAt,
      })),
      groups: groups.sort(),
      settings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Không thể tải nhật ký API" },
      { status: 500 }
    );
  }
}

async function PATCHHandler(request: NextRequest) {
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
      4 * 1024
    )) as Record<string, unknown>;
    const requestedRetentionDays =
      body.retentionDays === undefined
        ? API_LOG_RETENTION_DAYS
        : Number(body.retentionDays);
    const retentionDays = API_LOG_RETENTION_DAYS;
    const slowThresholdMs = Number(body.slowThresholdMs);
    if (
      requestedRetentionDays !== API_LOG_RETENTION_DAYS ||
      !Number.isSafeInteger(slowThresholdMs) ||
      slowThresholdMs < 100 ||
      slowThresholdMs > 60_000
    ) {
      return NextResponse.json(
        { success: false, message: "Cấu hình API log không hợp lệ" },
        { status: 400 }
      );
    }

    await Promise.all([connectDB(), connectEventDB()]);
    const ApiLogSetting = getApiLogSettingModel();
    const ApiRequestLog = getApiRequestLogModel();
    await enforceRateLimit(
      "admin:api-log-settings",
      actor.payload.userId,
      20,
      60 * 60 * 1_000
    );
    const previous = await getApiLogSettings();
    await ApiLogSetting.updateOne(
      { key: "api-logs" },
      {
        $set: {
          retentionDays,
          slowThresholdMs,
          updatedBy: actor.payload.userId,
        },
        $setOnInsert: { key: "api-logs" },
      },
      { upsert: true, runValidators: true }
    );
    invalidateApiLogSettingsCache();

    let migrationWarning = "";
    try {
      await ApiRequestLog.updateMany({}, [
        {
          $set: {
            slowThresholdMsSnapshot: slowThresholdMs,
            isSlow: { $gte: ["$durationMs", slowThresholdMs] },
          },
        },
      ]);
    } catch {
      migrationWarning =
        "Cấu hình mới đã áp dụng; một số log cũ chưa được phân loại lại.";
    }

    await recordAdminAudit({
      request,
      actorId: actor.payload.userId,
      actorRole: actor.user.role,
      action: "API_LOG_SETTINGS_UPDATED",
      targetType: "ApiLogSetting",
      targetId: "api-logs",
      summary: "Cập nhật ngưỡng phát hiện API chậm",
      changes: {
        previous,
        current: { retentionDays, slowThresholdMs },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình API log",
      warning: migrationWarning,
      settings: { retentionDays, slowThresholdMs },
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
        { success: false, message: "Dữ liệu cấu hình quá lớn" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể lưu cấu hình API log" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
export const PATCH = withApiLogging(PATCHHandler);
