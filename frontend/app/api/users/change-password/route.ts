import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Session from "@/app/models/Session";
import { authenticateRequest, cookieOptions } from "@/app/lib/Auth";
import {
  enforceRateLimit,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
  validatePassword,
} from "@/app/lib/ServerSecurity";

class PasswordChangeStateError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PasswordChangeStateError";
    this.status = status;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }
    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const passwordError = validatePassword(body.newPassword);
    if (
      typeof body.oldPassword !== "string" ||
      body.oldPassword.length > 128 ||
      passwordError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: passwordError || "Vui lòng điền đầy đủ thông tin",
        },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "change-password",
      payload.userId,
      5,
      15 * 60 * 1000
    );
    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(
        async () => {
          const user = await User.findOne({
            _id: payload.userId,
            isActive: true,
          })
            .select("+password")
            .session(dbSession);
          if (!user) {
            throw new PasswordChangeStateError(
              "Không tìm thấy người dùng",
              404
            );
          }
          if (!(await user.comparePassword(body.oldPassword as string))) {
            throw new PasswordChangeStateError(
              "Mật khẩu hiện tại không chính xác",
              400
            );
          }

          user.password = body.newPassword as string;
          await user.save({ session: dbSession });
          await Session.updateMany(
            { userId: user._id, isActive: true },
            { $set: { isActive: false } },
            { session: dbSession }
          );
        },
        {
          readPreference: "primary",
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
          maxCommitTimeMS: 10_000,
        }
      );
    } finally {
      await dbSession.endSession();
    }

    const response = NextResponse.json({
      success: true,
      reauthenticate: true,
      message: "Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.",
    });
    response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set("refresh_token", "", {
      ...cookieOptions,
      maxAge: 0,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
        },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu thay đổi mật khẩu quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof PasswordChangeStateError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
