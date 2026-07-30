import "server-only";

import { randomUUID } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { verifyAccessToken } from "@/app/lib/Auth";
import connectEventDB from "@/app/lib/ConnectEventDB";
import { runWithApiRequestContext } from "@/app/lib/RequestContext";
import { getClientIp } from "@/app/lib/ServerSecurity";
import { getApiLogSettingModel } from "@/app/models/ApiLogSetting";
import { getApiRequestLogModel } from "@/app/models/ApiRequestLog";
import type { ApiLogOutcome } from "@/app/types/ApiLog";

export const API_LOG_RETENTION_DAYS = 7;
const DEFAULT_SLOW_THRESHOLD_MS = 1_000;
const SETTINGS_CACHE_MS = 60_000;
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONGO_ID_PATTERN = /^[0-9a-f]{24}$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_ID_PATTERN = /^run_[0-9a-f]{32}$/i;
const SENSITIVE_QUERY_KEY_PATTERN =
  /(authorization|cookie|token|secret|password|passwd|signature|checksum|api[_-]?key|otp|pin|code)/i;
const STATIC_USER_ROUTES = new Set([
  "change-email",
  "change-password",
  "change-username",
  "check-username",
  "credit-history",
  "update",
]);

export interface ApiLogSettings {
  retentionDays: number;
  slowThresholdMs: number;
}

type RouteHandler<TContext = unknown> = (
  request: NextRequest,
  context: TContext
) => Response | Promise<Response>;

interface PendingApiLog {
  requestId: string;
  method: string;
  path: string;
  routeGroup: string;
  queryKeys: string[];
  statusCode: number;
  durationMs: number;
  outcome: ApiLogOutcome;
  actorId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  retryAfterSeconds?: number;
  errorType?: string;
}

declare global {
  var intervApiLogSettingsCache:
    | {
        value: ApiLogSettings;
        expiresAt: number;
      }
    | undefined;
}

function boundedInteger(
  rawValue: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const value = Number(rawValue);
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

function defaultSettings(): ApiLogSettings {
  return {
    retentionDays: API_LOG_RETENTION_DAYS,
    slowThresholdMs: boundedInteger(
      process.env.API_LOG_SLOW_THRESHOLD_MS,
      DEFAULT_SLOW_THRESHOLD_MS,
      100,
      60_000
    ),
  };
}

export async function getApiLogSettings(): Promise<ApiLogSettings> {
  const cached = globalThis.intervApiLogSettingsCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const defaults = defaultSettings();
  await connectEventDB();
  const ApiLogSetting = getApiLogSettingModel();
  await ApiLogSetting.init();
  const setting = await ApiLogSetting.findOneAndUpdate(
    { key: "api-logs" },
    {
      $setOnInsert: {
        key: "api-logs",
        retentionDays: defaults.retentionDays,
        slowThresholdMs: defaults.slowThresholdMs,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  ).lean();
  const value = {
    retentionDays: API_LOG_RETENTION_DAYS,
    slowThresholdMs:
      setting?.slowThresholdMs ?? defaults.slowThresholdMs,
  };
  globalThis.intervApiLogSettingsCache = {
    value,
    expiresAt: Date.now() + SETTINGS_CACHE_MS,
  };
  return value;
}

export function invalidateApiLogSettingsCache(): void {
  globalThis.intervApiLogSettingsCache = undefined;
}

function safeSize(value: string | null): number | undefined {
  if (!value) return undefined;
  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : undefined;
}

function requestIdFrom(request: NextRequest): string {
  const provided = request.headers.get("x-interv-request-id") || "";
  return REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID();
}

function cleanPathname(value: string): string {
  let pathname = value.trim().slice(0, 500);
  if (!pathname.startsWith("/api/")) {
    pathname = "/api/unknown";
  }
  pathname = pathname.split("?")[0].replace(/\/{2,}/g, "/");
  const segments = pathname.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (
      MONGO_ID_PATTERN.test(segment) ||
      UUID_PATTERN.test(segment) ||
      RUN_ID_PATTERN.test(segment)
    ) {
      segments[index] = ":id";
    }
  }
  if (
    segments[1] === "api" &&
    segments[2] === "users" &&
    segments[3] &&
    !STATIC_USER_ROUTES.has(segments[3])
  ) {
    segments[3] = ":username";
  }
  return segments.join("/").slice(0, 500);
}

function requestPath(request: NextRequest): {
  path: string;
  routeGroup: string;
} {
  const internalOriginalPath = request.headers.get(
    "x-interv-original-path"
  );
  const isCsrfBlock =
    request.nextUrl.pathname === "/api/security/csrf-blocked" ||
    Boolean(internalOriginalPath);
  const path = cleanPathname(
    internalOriginalPath || request.nextUrl.pathname
  );
  const group = path.split("/")[2] || "unknown";
  return {
    path,
    routeGroup: isCsrfBlock ? "security" : group.slice(0, 80),
  };
}

function queryKeys(request: NextRequest): string[] {
  return Array.from(new Set(request.nextUrl.searchParams.keys()))
    .slice(0, 30)
    .map((key) => {
      const clean = key.trim().slice(0, 80);
      return SENSITIVE_QUERY_KEY_PATTERN.test(clean)
        ? "[redacted]"
        : clean;
    });
}

function outcomeFor(
  statusCode: number,
  unhandled: boolean
): ApiLogOutcome {
  if (unhandled) return "UNHANDLED_ERROR";
  if (statusCode >= 500) return "SERVER_ERROR";
  if (statusCode >= 400) return "CLIENT_ERROR";
  return "SUCCESS";
}

function actorFrom(request: NextRequest): {
  actorId?: string;
  sessionId?: string;
} {
  try {
    const token = request.cookies.get("access_token")?.value;
    const payload = token ? verifyAccessToken(token) : null;
    return {
      actorId: payload?.userId,
      sessionId: payload?.sessionId,
    };
  } catch {
    return {};
  }
}

function safeErrorType(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 120);
  }
  return "UnknownError";
}

async function persistApiRequestLog(log: PendingApiLog): Promise<void> {
  try {
    const settings = await getApiLogSettings();
    const ApiRequestLog = getApiRequestLogModel();
    await ApiRequestLog.init();
    await ApiRequestLog.updateOne(
      { requestId: log.requestId },
      {
        $setOnInsert: {
          ...log,
          source: "next-api",
          isSlow: log.durationMs >= settings.slowThresholdMs,
          slowThresholdMsSnapshot: settings.slowThresholdMs,
          actorId:
            log.actorId && Types.ObjectId.isValid(log.actorId)
              ? new Types.ObjectId(log.actorId)
              : undefined,
        },
      },
      { upsert: true, runValidators: true }
    );
  } catch {
    console.error(
      JSON.stringify({
        event: "api_log_persist_failed",
        requestId: log.requestId,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
      })
    );
  }
}

function scheduleLog(log: PendingApiLog): void {
  after(async () => {
    await persistApiRequestLog(log);
  });
}

export function withApiLogging<TContext = unknown>(
  handler: RouteHandler<TContext>
): RouteHandler<TContext> {
  return async (request, context) => {
    const startedAt = performance.now();
    const requestId = requestIdFrom(request);
    const { path, routeGroup } = requestPath(request);
    const actor = actorFrom(request);
    let response: Response;
    let unhandled = false;
    let errorType: string | undefined;

    try {
      response = await runWithApiRequestContext(
        { requestId, path },
        () => handler(request, context)
      );
    } catch (error) {
      unhandled = true;
      errorType = safeErrorType(error);
      response = NextResponse.json(
        { success: false, message: "Lỗi hệ thống, vui lòng thử lại" },
        { status: 500 }
      );
    }

    response.headers.set("X-Request-Id", requestId);
    const durationMs = Math.max(
      0,
      Math.round((performance.now() - startedAt) * 100) / 100
    );
    const retryAfterSeconds = safeSize(
      response.headers.get("retry-after")
    );
    scheduleLog({
      requestId,
      method: request.method.slice(0, 12).toUpperCase(),
      path,
      routeGroup,
      queryKeys: queryKeys(request),
      statusCode: response.status,
      durationMs,
      outcome: outcomeFor(response.status, unhandled),
      ...actor,
      ipAddress: getClientIp(request),
      userAgent: (request.headers.get("user-agent") || "unknown").slice(
        0,
        256
      ),
      requestSizeBytes: safeSize(request.headers.get("content-length")),
      responseSizeBytes: safeSize(response.headers.get("content-length")),
      retryAfterSeconds,
      errorType,
    });
    return response;
  };
}
