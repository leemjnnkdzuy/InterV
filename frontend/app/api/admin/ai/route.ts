import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  getDeepSeekProviderConfig,
  type DeepSeekPricing,
} from "@/app/lib/DeepSeekUsage";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import AiProviderSetting from "@/app/models/AiProviderSetting";
import AiUsageEvent from "@/app/models/AiUsageEvent";

const OPERATIONS = new Set([
  "interview_start",
  "interview_follow_up",
  "interview_evaluate",
]);
const STATUSES = new Set(["SUCCESS", "FAILED"]);
const ALLOWED_DAYS = new Set([7, 30, 90]);

function integerParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function boundedMoney(value: unknown, max = 1_000_000): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max
    ? number
    : null;
}

function parsePricing(value: unknown): DeepSeekPricing[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    return null;
  }
  const pricing: DeepSeekPricing[] = [];
  const models = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const model =
      typeof item.model === "string" ? item.model.trim() : "";
    const cacheHitInputUsdPerMillion = boundedMoney(
      item.cacheHitInputUsdPerMillion,
      10_000
    );
    const cacheMissInputUsdPerMillion = boundedMoney(
      item.cacheMissInputUsdPerMillion,
      10_000
    );
    const outputUsdPerMillion = boundedMoney(
      item.outputUsdPerMillion,
      10_000
    );
    if (
      !/^[a-zA-Z0-9._-]{2,120}$/.test(model) ||
      models.has(model) ||
      cacheHitInputUsdPerMillion === null ||
      cacheMissInputUsdPerMillion === null ||
      outputUsdPerMillion === null
    ) {
      return null;
    }
    models.add(model);
    pricing.push({
      model,
      cacheHitInputUsdPerMillion,
      cacheMissInputUsdPerMillion,
      outputUsdPerMillion,
    });
  }
  return pricing;
}

function populatedUser(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("username" in value) ||
    !("email" in value)
  ) {
    return null;
  }
  return {
    username: String(value.username),
    email: String(value.email),
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
    const page = Math.min(integerParam(params.get("page"), 1), 500);
    const limit = Math.min(integerParam(params.get("limit"), 20), 50);
    const status = params.get("status")?.toUpperCase() || "";
    const operation = params.get("operation") || "";
    const model = (params.get("model") || "").trim().slice(0, 120);
    if (
      (status && !STATUSES.has(status)) ||
      (operation && !OPERATIONS.has(operation)) ||
      (model && !/^[a-zA-Z0-9._-]{2,120}$/.test(model))
    ) {
      return NextResponse.json(
        { success: false, message: "Bộ lọc không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const rangeMatch = { provider: "deepseek", createdAt: { $gte: from } };
    const listMatch: Record<string, unknown> = { ...rangeMatch };
    if (status) listMatch.status = status;
    if (operation) listMatch.operation = operation;
    if (model) listMatch.model = model;

    const [
      summaryRows,
      monthlyRows,
      trend,
      byModel,
      byOperation,
      usage,
      totalUsage,
      config,
    ] = await Promise.all([
      AiUsageEvent.aggregate<{
        _id: null;
        events: number;
        successfulEvents: number;
        failedEvents: number;
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cacheHitTokens: number;
        cacheMissTokens: number;
        reasoningTokens: number;
        latencyMs: number;
        estimatedCostUsd: number;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: null,
            events: { $sum: 1 },
            successfulEvents: {
              $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] },
            },
            failedEvents: {
              $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
            },
            requests: { $sum: "$requestCount" },
            successfulRequests: { $sum: "$successfulRequestCount" },
            failedRequests: { $sum: "$failedRequestCount" },
            promptTokens: { $sum: "$promptTokens" },
            completionTokens: { $sum: "$completionTokens" },
            totalTokens: { $sum: "$totalTokens" },
            cacheHitTokens: { $sum: "$cacheHitTokens" },
            cacheMissTokens: { $sum: "$cacheMissTokens" },
            reasoningTokens: { $sum: "$reasoningTokens" },
            latencyMs: { $sum: "$latencyMs" },
            estimatedCostUsd: { $sum: "$estimatedCostUsd" },
          },
        },
      ]),
      AiUsageEvent.aggregate<{ _id: null; estimatedCostUsd: number }>([
        {
          $match: {
            provider: "deepseek",
            createdAt: { $gte: monthStart },
          },
        },
        {
          $group: {
            _id: null,
            estimatedCostUsd: { $sum: "$estimatedCostUsd" },
          },
        },
      ]),
      AiUsageEvent.aggregate<{
        _id: string;
        requests: number;
        tokens: number;
        costUsd: number;
        failedEvents: number;
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
            requests: { $sum: "$requestCount" },
            tokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$estimatedCostUsd" },
            failedEvents: {
              $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AiUsageEvent.aggregate<{
        _id: string;
        events: number;
        requests: number;
        tokens: number;
        costUsd: number;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: "$model",
            events: { $sum: 1 },
            requests: { $sum: "$requestCount" },
            tokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$estimatedCostUsd" },
          },
        },
        { $sort: { costUsd: -1 } },
      ]),
      AiUsageEvent.aggregate<{
        _id: string;
        events: number;
        requests: number;
        tokens: number;
        costUsd: number;
        averageLatencyMs: number;
      }>([
        { $match: rangeMatch },
        {
          $group: {
            _id: "$operation",
            events: { $sum: 1 },
            requests: { $sum: "$requestCount" },
            tokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$estimatedCostUsd" },
            averageLatencyMs: { $avg: "$latencyMs" },
          },
        },
        { $sort: { events: -1 } },
      ]),
      AiUsageEvent.find(listMatch)
        .select(
          "userId practiceRunId aiRunId operation status model requestCount promptTokens completionTokens totalTokens cacheHitTokens reasoningTokens latencyMs estimatedCostUsd errorCode errorMessage createdAt"
        )
        .populate("userId", "username email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AiUsageEvent.countDocuments(listMatch),
      getDeepSeekProviderConfig(),
    ]);

    const summary = summaryRows[0] || {
      events: 0,
      successfulEvents: 0,
      failedEvents: 0,
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      reasoningTokens: 0,
      latencyMs: 0,
      estimatedCostUsd: 0,
    };
    const monthlySpendUsd = monthlyRows[0]?.estimatedCostUsd || 0;

    return NextResponse.json({
      success: true,
      range: { days, from, to: new Date() },
      metrics: {
        ...summary,
        successRate:
          summary.requests > 0
            ? (summary.successfulRequests / summary.requests) * 100
            : summary.events > 0
              ? (summary.successfulEvents / summary.events) * 100
              : 100,
        cacheHitRate:
          summary.promptTokens > 0
            ? (summary.cacheHitTokens / summary.promptTokens) * 100
            : 0,
        averageLatencyMs:
          summary.requests > 0
            ? Math.round(summary.latencyMs / summary.requests)
            : 0,
        monthlySpendUsd,
        monthlyBudgetUsd: config.monthlyBudgetUsd,
        budgetUsageRate:
          config.monthlyBudgetUsd > 0
            ? (monthlySpendUsd / config.monthlyBudgetUsd) * 100
            : 0,
      },
      trend: trend.map((item) => ({
        date: item._id,
        requests: item.requests,
        tokens: item.tokens,
        costUsd: item.costUsd,
        failedEvents: item.failedEvents,
      })),
      byModel: byModel.map((item) => ({
        model: item._id || "unknown",
        events: item.events,
        requests: item.requests,
        tokens: item.tokens,
        costUsd: item.costUsd,
      })),
      byOperation: byOperation.map((item) => ({
        operation: item._id,
        events: item.events,
        requests: item.requests,
        tokens: item.tokens,
        costUsd: item.costUsd,
        averageLatencyMs: Math.round(item.averageLatencyMs || 0),
      })),
      usage: usage.map((event) => ({
        id: event._id.toString(),
        user: populatedUser(event.userId),
        practiceRunId: event.practiceRunId.toString(),
        aiRunId: event.aiRunId,
        operation: event.operation,
        status: event.status,
        model: event.model,
        requestCount: event.requestCount,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        cacheHitTokens: event.cacheHitTokens,
        reasoningTokens: event.reasoningTokens,
        latencyMs: event.latencyMs,
        estimatedCostUsd: event.estimatedCostUsd,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        createdAt: event.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: totalUsage,
        pages: Math.max(1, Math.ceil(totalUsage / limit)),
      },
      settings: config,
    });
  } catch (error) {
    console.error("GET /api/admin/ai error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải dữ liệu DeepSeek" },
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
      16 * 1024
    )) as Record<string, unknown>;
    const pricing = parsePricing(body.pricing);
    const monthlyBudgetUsd = boundedMoney(body.monthlyBudgetUsd);
    const lowBalanceThresholdUsd = boundedMoney(
      body.lowBalanceThresholdUsd
    );
    if (
      !pricing ||
      monthlyBudgetUsd === null ||
      lowBalanceThresholdUsd === null
    ) {
      return NextResponse.json(
        { success: false, message: "Cấu hình DeepSeek không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "admin:deepseek-settings",
      actor.payload.userId,
      30,
      60 * 60 * 1000
    );
    const previous = await getDeepSeekProviderConfig();
    await AiProviderSetting.updateOne(
      { provider: "deepseek" },
      {
        $set: {
          pricing,
          monthlyBudgetUsd,
          lowBalanceThresholdUsd,
          updatedBy: actor.payload.userId,
        },
        $setOnInsert: { provider: "deepseek" },
      },
      { upsert: true, runValidators: true }
    );
    await recordAdminAudit({
      request,
      actorId: actor.payload.userId,
      actorRole: actor.user.role,
      action: "DEEPSEEK_SETTINGS_UPDATED",
      targetType: "AiProviderSetting",
      targetId: "deepseek",
      summary: "Cập nhật đơn giá và ngưỡng cảnh báo DeepSeek",
      changes: {
        previous,
        current: {
          pricing,
          monthlyBudgetUsd,
          lowBalanceThresholdUsd,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình DeepSeek",
      settings: {
        pricing,
        monthlyBudgetUsd,
        lowBalanceThresholdUsd,
      },
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
    console.error("PATCH /api/admin/ai error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lưu cấu hình DeepSeek" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
export const PATCH = withApiLogging(PATCHHandler);
