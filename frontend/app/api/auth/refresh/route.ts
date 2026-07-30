import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import Session from "@/app/models/Session";
import {
  ACCESS_TOKEN_MAX_AGE,
  cookieOptions,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_LONG_MAX_AGE,
  REFRESH_TOKEN_SHORT_MAX_AGE,
  safeHashEquals,
  verifyRefreshToken,
} from "@/app/lib/Auth";

const ROTATION_GRACE_MS = 10_000;

function unauthenticatedResponse(
  status: number,
  message: string,
  sessionRevoked = false
) {
  const response = NextResponse.json(
    {
      success: false,
      authenticated: false,
      message,
      ...(sessionRevoked ? { sessionRevoked: true } : {}),
    },
    { status }
  );
  response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set("refresh_token", "", { ...cookieOptions, maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const soft = request.nextUrl.searchParams.get("soft") === "true";
    const unauthenticatedStatus = soft ? 200 : 401;
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (!refreshToken) {
      return unauthenticatedResponse(
        unauthenticatedStatus,
        "Không tìm thấy refresh token"
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload?.sessionId) {
      return unauthenticatedResponse(
        unauthenticatedStatus,
        "Refresh token không hợp lệ hoặc đã hết hạn"
      );
    }

    await connectDB();
    const providedHash = hashToken(refreshToken);
    let session = await Session.findOne({
      _id: payload.sessionId,
      userId: payload.userId,
      isActive: true,
      refreshExpiresAt: { $gt: new Date() },
    }).select(
      "+refreshTokenHash +previousRefreshTokenHash previousRefreshValidUntil refreshExpiresAt"
    );

    for (let attempt = 0; attempt < 2 && session; attempt += 1) {
      const now = Date.now();
      const matchesCurrent = safeHashEquals(
        providedHash,
        session.refreshTokenHash
      );
      const matchesPrevious =
        Boolean(session.previousRefreshValidUntil) &&
        session.previousRefreshValidUntil!.getTime() > now &&
        safeHashEquals(providedHash, session.previousRefreshTokenHash);

      if (!matchesCurrent && !matchesPrevious) {
        await Session.updateOne(
          { _id: session._id, isActive: true },
          { $set: { isActive: false } }
        );
        return unauthenticatedResponse(
          unauthenticatedStatus,
          "Refresh token đã được sử dụng lại; phiên đã bị thu hồi",
          true
        );
      }

      const bundle = generateRefreshToken(
        payload.userId,
        Boolean(payload.rememberMe),
        payload.sessionId
      );
      const previousHash = session.refreshTokenHash;
      const updated = await Session.findOneAndUpdate(
        {
          _id: session._id,
          isActive: true,
          refreshTokenHash: previousHash,
          refreshExpiresAt: { $gt: new Date() },
        },
        {
          $set: {
            refreshTokenHash: bundle.tokenHash,
            previousRefreshTokenHash: previousHash,
            previousRefreshValidUntil: new Date(
              Date.now() + ROTATION_GRACE_MS
            ),
            lastActiveAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        session = await Session.findOne({
          _id: payload.sessionId,
          userId: payload.userId,
          isActive: true,
          refreshExpiresAt: { $gt: new Date() },
        }).select(
          "+refreshTokenHash +previousRefreshTokenHash previousRefreshValidUntil refreshExpiresAt"
        );
        continue;
      }

      const accessToken = generateAccessToken(
        payload.userId,
        payload.sessionId
      );
      const remainingSeconds = Math.max(
        1,
        Math.floor(
          (updated.refreshExpiresAt.getTime() - Date.now()) / 1000
        )
      );
      const configuredMaxAge = payload.rememberMe
        ? REFRESH_TOKEN_LONG_MAX_AGE / 1000
        : REFRESH_TOKEN_SHORT_MAX_AGE / 1000;
      const response = NextResponse.json({
        success: true,
        authenticated: true,
        message: "Token đã được làm mới",
      });
      response.cookies.set("access_token", accessToken, {
        ...cookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE / 1000,
      });
      response.cookies.set("refresh_token", bundle.token, {
        ...cookieOptions,
        maxAge: Math.min(configuredMaxAge, remainingSeconds),
      });
      return response;
    }

    return unauthenticatedResponse(
      unauthenticatedStatus,
      "Phiên đăng nhập đã hết hạn hoặc bị thu hồi",
      true
    );
  } catch (error: unknown) {
    console.error("Refresh token API error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
