import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
} from "@/app/lib/Auth";

const MAX_SESSIONS = 2;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password, rememberMe = false } = body;

    if (!identifier || !password) {
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

    const user = isEmail
      ? await User.findOne({ email: identifier.toLowerCase() })
      : await User.findOne({ username: identifier.toLowerCase() });

    if (!user) {
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
      .lean();

    if (activeSessions.length >= MAX_SESSIONS) {
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS + 1);
      const revokeIds = sessionsToRevoke.map((s: any) => s._id);
      await Session.updateMany({ _id: { $in: revokeIds } }, { $set: { isActive: false } });
    }

    const sessionId = randomUUID();
    const deviceInfo = request.headers.get("user-agent") || "Unknown device";
    const ipAddress = request.headers.get("x-forwarded-for") || (request as any).ip || "";

    await Session.create({
      userId: user._id,
      sessionId,
      deviceInfo,
      ipAddress,
    });

    const accessToken = generateAccessToken(userId, sessionId);
    const refreshToken = generateRefreshToken(userId, rememberMe, sessionId);

    const refreshTokenMaxAge = rememberMe
      ? REFRESH_TOKEN_LONG_MAX_AGE
      : REFRESH_TOKEN_SHORT_MAX_AGE;

    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role || "user",
      avatar: user.avatar,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
      user: userData,
    });

    response.cookies.set("access_token", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE / 1000,
    });

    response.cookies.set("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenMaxAge / 1000,
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
