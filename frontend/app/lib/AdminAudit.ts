import "server-only";

import type { ClientSession } from "mongoose";
import type { NextRequest } from "next/server";

import { getClientIp } from "@/app/lib/ServerSecurity";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import type { AppRole } from "@/app/types";

const SENSITIVE_KEY = /password|secret|token|cookie|authorization|api.?key/i;

function sanitizeChanges(
  changes: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!changes) {
    return {};
  }
  const safeEntries = Object.entries(changes)
    .filter(([key]) => !SENSITIVE_KEY.test(key))
    .slice(0, 30)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.slice(0, 500)];
      }
      if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        return [key, value];
      }
      return [key, JSON.stringify(value).slice(0, 1_000)];
    });
  return Object.fromEntries(safeEntries);
}

export async function recordAdminAudit(input: {
  request: NextRequest;
  actorId: string;
  actorRole: AppRole;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  changes?: Record<string, unknown>;
  session?: ClientSession;
}) {
  const document = {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action.slice(0, 120),
    targetType: input.targetType.slice(0, 80),
    targetId: input.targetId?.slice(0, 120),
    summary: input.summary.slice(0, 500),
    changes: sanitizeChanges(input.changes),
    ipAddress: getClientIp(input.request).slice(0, 80),
    userAgent: (input.request.headers.get("user-agent") || "Unknown").slice(
      0,
      256
    ),
  };
  if (input.session) {
    await AdminAuditLog.create([document], { session: input.session });
    return;
  }
  await AdminAuditLog.create(document);
}
