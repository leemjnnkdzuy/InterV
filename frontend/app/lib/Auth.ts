import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { Types } from "mongoose";
import jwt from "jsonwebtoken";

import type { AppRole, TokenPayload } from "@/app/types";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_LONG_EXPIRES_IN,
  REFRESH_TOKEN_LONG_MAX_AGE,
  REFRESH_TOKEN_SHORT_EXPIRES_IN,
  REFRESH_TOKEN_SHORT_MAX_AGE,
} from "@/app/contants";

export * from "@/app/contants/Auth";
export type { TokenPayload } from "@/app/types/Auth";

const JWT_ISSUER = "interv";
const ACCESS_AUDIENCE = "interv-web";
const REFRESH_AUDIENCE = "interv-refresh";
const REJECTED_SECRET_VALUES = new Set([
  "access_secret_key",
  "refresh_secret_key",
  "changeme",
  "secret",
]);

export interface RefreshTokenBundle {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

interface PrincipalUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  role: AppRole;
  avatar?: string;
  credits: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface AuthenticatedPrincipal {
  payload: TokenPayload;
  user: PrincipalUser;
}

export interface SerializedPrincipalUser {
  id: string;
  username: string;
  email: string;
  role: AppRole;
  avatar?: string;
  credits: number;
  isVerified: boolean;
  createdAt: string;
}

export type AuthorizationResult =
  | {
      authorized: true;
      principal: AuthenticatedPrincipal;
    }
  | {
      authorized: false;
      status: 401 | 403;
      message: string;
    };

function requireJwtSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const value = process.env[name]?.trim() || "";
  if (
    Buffer.byteLength(value, "utf8") < 32 ||
    REJECTED_SECRET_VALUES.has(value.toLowerCase())
  ) {
    throw new Error(`${name} must be a unique secret of at least 32 bytes`);
  }
  return value;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeHashEquals(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function generateAccessToken(
  userId: string,
  sessionId?: string
): string {
  return jwt.sign(
    { userId, sessionId, tokenType: "access" },
    requireJwtSecret("JWT_ACCESS_SECRET"),
    {
      algorithm: "HS256",
      audience: ACCESS_AUDIENCE,
      issuer: JWT_ISSUER,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}

export function generateRefreshToken(
  userId: string,
  rememberMe = false,
  sessionId?: string
): RefreshTokenBundle {
  const expiresIn = rememberMe
    ? REFRESH_TOKEN_LONG_EXPIRES_IN
    : REFRESH_TOKEN_SHORT_EXPIRES_IN;
  const maxAge = rememberMe
    ? REFRESH_TOKEN_LONG_MAX_AGE
    : REFRESH_TOKEN_SHORT_MAX_AGE;
  const token = jwt.sign(
    { userId, sessionId, tokenType: "refresh", rememberMe },
    requireJwtSecret("JWT_REFRESH_SECRET"),
    {
      algorithm: "HS256",
      audience: REFRESH_AUDIENCE,
      issuer: JWT_ISSUER,
      expiresIn,
      jwtid: randomUUID(),
    }
  );
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + maxAge),
  };
}

function isValidPayload(
  decoded: string | jwt.JwtPayload,
  tokenType: "access" | "refresh"
): decoded is jwt.JwtPayload & TokenPayload {
  if (typeof decoded === "string") {
    return false;
  }
  return (
    typeof decoded.userId === "string" &&
    /^[0-9a-fA-F]{24}$/.test(decoded.userId) &&
    typeof decoded.sessionId === "string" &&
    /^[0-9a-fA-F]{24}$/.test(decoded.sessionId) &&
    decoded.tokenType === tokenType
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, requireJwtSecret("JWT_ACCESS_SECRET"), {
      algorithms: ["HS256"],
      audience: ACCESS_AUDIENCE,
      issuer: JWT_ISSUER,
    });
    return isValidPayload(decoded, "access") ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, requireJwtSecret("JWT_REFRESH_SECRET"), {
      algorithms: ["HS256"],
      audience: REFRESH_AUDIENCE,
      issuer: JWT_ISSUER,
    });
    return isValidPayload(decoded, "refresh") ? decoded : null;
  } catch {
    return null;
  }
}

async function resolvePrincipal(
  token: string | undefined
): Promise<AuthenticatedPrincipal | null> {
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sessionId) {
    return null;
  }

  const connectDB = (await import("./ConnectDB")).default;
  const Session = (await import("@/app/models/Session")).default;
  const User = (await import("@/app/models/User")).default;
  await connectDB();

  const [session, user] = await Promise.all([
    Session.findOne({
      _id: payload.sessionId,
      userId: payload.userId,
      isActive: true,
    })
      .select("_id")
      .lean(),
    User.findOne({ _id: payload.userId, isActive: true })
      .select(
        "_id username email role avatar credits isActive isVerified createdAt"
      )
      .lean<PrincipalUser>(),
  ]);
  if (!session || !user) {
    return null;
  }
  return { payload, user };
}

export async function authenticatePrincipal(
  request: NextRequest
): Promise<AuthenticatedPrincipal | null> {
  return resolvePrincipal(request.cookies.get("access_token")?.value);
}

export async function authenticateRequest(
  request: NextRequest
): Promise<TokenPayload | null> {
  return (await authenticatePrincipal(request))?.payload || null;
}

export async function authorizeRequest(
  request: NextRequest,
  allowedRoles: readonly AppRole[]
): Promise<AuthorizationResult> {
  const principal = await authenticatePrincipal(request);
  if (!principal) {
    return {
      authorized: false,
      status: 401,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
    };
  }
  if (!allowedRoles.includes(principal.user.role)) {
    return {
      authorized: false,
      status: 403,
      message: "Bạn không có quyền thực hiện thao tác này",
    };
  }
  return { authorized: true, principal };
}

export async function getCurrentUser(): Promise<SerializedPrincipalUser | null> {
  const cookieStore = await cookies();
  const principal = await resolvePrincipal(
    cookieStore.get("access_token")?.value
  );
  if (!principal) {
    return null;
  }
  return {
    id: principal.user._id.toString(),
    username: principal.user.username,
    email: principal.user.email,
    role: principal.user.role,
    avatar: principal.user.avatar,
    credits: principal.user.credits || 0,
    isVerified: principal.user.isVerified,
    createdAt: principal.user.createdAt.toISOString(),
  };
}

export async function verifyAdmin(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["admin"]);
  if (!authorization.authorized) {
    return {
      error: authorization.message,
      status: authorization.status,
      user: null,
    };
  }
  return { user: authorization.principal.user, error: null, status: 200 };
}

export const accessTokenCookieMaxAge = ACCESS_TOKEN_MAX_AGE / 1000;
