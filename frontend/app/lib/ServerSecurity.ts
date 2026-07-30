import "server-only";

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/app/contants";
import SecurityRateLimit from "@/app/models/SecurityRateLimit";

const OTP_PATTERN = /^\d{6}$/;

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readJsonBodyLimited(
  request: NextRequest,
  maxBytes: number
): Promise<unknown> {
  const raw = await readRequestBodyLimited(request, maxBytes);
  return JSON.parse(raw.toString("utf8"));
}

export async function readRequestBodyLimited(
  request: NextRequest,
  maxBytes: number
): Promise<Buffer> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) {
    throw new SyntaxError("Request body is required");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export async function readFormDataLimited(
  request: NextRequest,
  maxBytes: number
): Promise<FormData> {
  const raw = await readRequestBodyLimited(request, maxBytes);
  const body = raw.buffer.slice(
    raw.byteOffset,
    raw.byteOffset + raw.byteLength
  ) as ArrayBuffer;
  const boundedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });
  return boundedRequest.formData();
}

export function isFileUpload(
  value: FormDataEntryValue | null
): value is File {
  return (
    value !== null &&
    typeof value !== "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0 &&
    typeof value.arrayBuffer === "function"
  );
}

export function getClientIp(request: NextRequest): string {
  const candidate =
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  return candidate.trim().slice(0, 64);
}

export function normalizeEmail(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().slice(0, 254)
    : "";
}

export function normalizeUsername(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().slice(0, 30)
    : "";
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Mật khẩu không hợp lệ";
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Mật khẩu không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự`;
  }
  return null;
}

export async function hashOtp(pin: string): Promise<string> {
  if (!OTP_PATTERN.test(pin)) {
    throw new Error("OTP must contain exactly six digits");
  }
  return bcrypt.hash(pin, 10);
}

export async function verifyOtp(
  pin: unknown,
  pinHash: string
): Promise<boolean> {
  if (typeof pin !== "string" || !OTP_PATTERN.test(pin) || !pinHash) {
    return false;
  }
  return bcrypt.compare(pin, pinHash);
}

export async function enforceRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number
): Promise<void> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const expiresAt = new Date(resetAt.getTime() + 24 * 60 * 60 * 1000);
  const key = createHash("sha256")
    .update(`${scope}:${identity}`)
    .digest("hex");

  const isActiveWindow = {
    $gt: [{ $ifNull: ["$resetAt", new Date(0)] }, now],
  };
  const record = await SecurityRateLimit.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          count: {
            $cond: [
              isActiveWindow,
              { $add: [{ $ifNull: ["$count", 0] }, 1] },
              1,
            ],
          },
          resetAt: { $cond: [isActiveWindow, "$resetAt", resetAt] },
          expiresAt: { $cond: [isActiveWindow, "$expiresAt", expiresAt] },
        },
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
      updatePipeline: true,
    }
  ).lean();

  if (record && record.count > limit) {
    throw new RateLimitError(
      Math.max(1, Math.ceil((record.resetAt.getTime() - Date.now()) / 1000))
    );
  }
}

export function rateLimitResponse(error: RateLimitError) {
  return {
    status: 429,
    headers: { "Retry-After": String(error.retryAfterSeconds) },
  };
}
