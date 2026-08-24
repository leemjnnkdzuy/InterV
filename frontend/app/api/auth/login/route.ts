import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import bcrypt from "bcryptjs";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Session from "@/app/models/Session";
import {
  generateAccessToken,
  generateRefreshToken,
  cookieOptions,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_SHORT_MAX_AGE,
  REFRESH_TOKEN_LONG_MAX_AGE,
  MAX_SESSIONS,
} from "@/app/lib/Auth";
import {
  enforceRateLimit,
  getClientIp,
  normalizeEmail,
  normalizeUsername,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

interface SessionSummary {
  _id: Types.ObjectId;
}

const dummyPasswordHash = bcrypt.hash("interv-invalid-login-sentinel", 12);

async function POSTHandler(request: NextRequest) {
  try {
    const body = (await readJsonBodyLimited(
      request,
      16 * 1024
    )) as Record<string, unknown>;
    const { identifier, password, rememberMe = false } = body;

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng nhập email/username và mật khẩu",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const isEmail = identifier.includes("@");
    const normalizedIdentifier = isEmail
      ? normalizeEmail(identifier)
      : normalizeUsername(identifier);
    if (!normalizedIdentifier) {
      return NextResponse.json(
        { success: false, message: "Email/Username hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(request);
    await Promise.all([
      enforceRateLimit("login:ip", clientIp, 30, 15 * 60 * 1000),
      enforceRateLimit(
        "login:account",
        normalizedIdentifier,
        10,
        15 * 60 * 1000
      ),
    ]);

    const user = isEmail
      ? await User.findOne({ email: normalizedIdentifier }).select("+password")
      : await User.findOne({ username: normalizedIdentifier }).select(
          "+password"
        );

    if (!user) {
      await bcrypt.compare(password, await dummyPasswordHash);
      return NextResponse.json(
        {
          success: false,
          message: "Email/Username hoặc mật khẩu không đúng",
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Email/Username hoặc mật khẩu không đúng",
        },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Tài khoản của bạn đã bị khóa." },
        { status: 403 }
      );
    }

    const userId = user._id.toString();

    // Enforce device session limit
    const activeSessions = await Session.find({
      userId: user._id,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean<SessionSummary[]>();

    if (activeSessions.length >= MAX_SESSIONS) {
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS + 1);
      const revokeIds = sessionsToRevoke.map((session) => session._id);
      await Session.updateMany({ _id: { $in: revokeIds } }, { $set: { isActive: false } });
    }

    const deviceInfo = (
      request.headers.get("user-agent") || "Unknown device"
    ).slice(0, 256);

    const session = await Session.create({
      userId: user._id,
      deviceInfo,
      ipAddress: clientIp,
    });
    const sessionId = session._id.toString();

    const accessToken = generateAccessToken(userId, sessionId);
    const refreshBundle = generateRefreshToken(
      userId,
      Boolean(rememberMe),
      sessionId
    );
    session.refreshTokenHash = refreshBundle.tokenHash;
    session.refreshExpiresAt = refreshBundle.expiresAt;
    await session.save();

    const refreshTokenMaxAge = rememberMe
      ? REFRESH_TOKEN_LONG_MAX_AGE
      : REFRESH_TOKEN_SHORT_MAX_AGE;

    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role || "user",
      avatar: user.avatar,
      dob: user.dob,
      fullName: user.fullName || "",
      gender: user.gender || "",
      headline: user.headline || "",
      targetRole: user.targetRole || "",
      targetIndustry: user.targetIndustry || "",
      skills: user.skills || [],
      education: user.education || [],
      workExperience: user.workExperience || [],
      cvFile: user.cvFile,
      isOnboarded: user.isOnboarded ?? false,
      credits: user.credits || 0,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
      role: userData.role,
      user: userData,
    });

    response.cookies.set("access_token", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE / 1000,
    });

    response.cookies.set("refresh_token", refreshBundle.token, {
      ...cookieOptions,
      maxAge: refreshTokenMaxAge / 1000,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau.",
        },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu đăng nhập quá lớn" },
        { status: 413 }
      );
    }
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
