import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Session from "@/app/models/Session";
import FogetPasswordPin from "@/app/models/FogetPasswordPin";
import { generatePIN, sendPasswordResetEmail } from "@/app/lib/Email";
import { MAX_PIN_ATTEMPTS, PIN_LOCK_MS } from "@/app/contants";
import { hashToken, safeHashEquals } from "@/app/lib/Auth";
import {
  enforceRateLimit,
  getClientIp,
  hashOtp,
  normalizeEmail,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
  validatePassword,
  verifyOtp,
} from "@/app/lib/ServerSecurity";

const RESET_TOKEN_COOKIE = "password_reset_token";
const RESET_GRANT_MS = 10 * 60 * 1000;

class ResetStateError extends Error {}

function setResetTokenCookie(
  response: NextResponse,
  value: string,
  maxAge: number
) {
  response.cookies.set(RESET_TOKEN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/reset-password",
    priority: "high",
    maxAge,
  });
}

async function POSTHandler(request: NextRequest) {
  try {
    const body = (await readJsonBodyLimited(
      request,
      16 * 1024
    )) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const normalizedEmail = normalizeEmail(body.email);
    const clientIp = getClientIp(request);

    await connectDB();

    if (action === "send-pin") {
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return NextResponse.json(
          { success: false, message: "Email không hợp lệ" },
          { status: 400 }
        );
      }
      await Promise.all([
        enforceRateLimit("reset:ip", clientIp, 5, 60 * 60 * 1000),
        enforceRateLimit("reset:email", normalizedEmail, 3, 15 * 60 * 1000),
      ]);

      const user = await User.findOne({ email: normalizedEmail })
        .select("_id")
        .lean();
      if (user) {
        const pin = generatePIN();
        const pinHash = await hashOtp(pin);
        await FogetPasswordPin.findOneAndUpdate(
          { email: normalizedEmail },
          {
            email: normalizedEmail,
            pinHash,
            verified: false,
            resetTokenHash: "",
            resetTokenExpiresAt: null,
            failedAttempts: 0,
            blockedUntil: null,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
          {
            upsert: true,
            returnDocument: "after",
            setDefaultsOnInsert: true,
          }
        );
        const result = await sendPasswordResetEmail(normalizedEmail, pin);
        if (!result.success) {
          console.error("Password reset email delivery failed");
        }
      }

      return NextResponse.json({
        success: true,
        message:
          "Nếu email tồn tại trong hệ thống, mã PIN sẽ được gửi đến hộp thư.",
      });
    }

    if (action === "verify-pin") {
      if (!normalizedEmail || typeof body.pin !== "string") {
        return NextResponse.json(
          { success: false, message: "Thiếu email hoặc mã PIN" },
          { status: 400 }
        );
      }
      await Promise.all([
        enforceRateLimit("reset-verify:ip", clientIp, 20, 10 * 60 * 1000),
        enforceRateLimit(
          "reset-verify:email",
          normalizedEmail,
          10,
          10 * 60 * 1000
        ),
      ]);

      const storedData = await FogetPasswordPin.findOne({
        email: normalizedEmail,
      }).select("+pinHash");
      if (!storedData || storedData.expiresAt.getTime() < Date.now()) {
        await FogetPasswordPin.deleteOne({ email: normalizedEmail });
        return NextResponse.json(
          {
            success: false,
            message: "Mã PIN đã hết hạn hoặc không tồn tại.",
          },
          { status: 400 }
        );
      }
      if (
        storedData.blockedUntil &&
        storedData.blockedUntil.getTime() > Date.now()
      ) {
        return NextResponse.json(
          { success: false, message: "Mã PIN đang bị khóa. Vui lòng đợi." },
          { status: 429 }
        );
      }

      if (!(await verifyOtp(body.pin, storedData.pinHash))) {
        const attempts = await FogetPasswordPin.findOneAndUpdate(
          { _id: storedData._id },
          { $inc: { failedAttempts: 1 } },
          { returnDocument: "after" }
        );
        const shouldLock =
          (attempts?.failedAttempts || 0) >= MAX_PIN_ATTEMPTS;
        if (shouldLock) {
          await FogetPasswordPin.updateOne(
            { _id: storedData._id },
            {
              $set: {
                failedAttempts: 0,
                blockedUntil: new Date(Date.now() + PIN_LOCK_MS),
              },
            }
          );
        }
        return NextResponse.json(
          {
            success: false,
            message: shouldLock
              ? "Bạn đã nhập sai mã PIN quá nhiều lần. Vui lòng thử lại sau."
              : "Mã PIN không đúng.",
          },
          { status: shouldLock ? 429 : 400 }
        );
      }

      const resetToken = randomBytes(32).toString("base64url");
      storedData.expiresAt = new Date(Date.now() + RESET_GRANT_MS);
      storedData.verified = true;
      storedData.resetTokenHash = hashToken(resetToken);
      storedData.resetTokenExpiresAt = new Date(
        Date.now() + RESET_GRANT_MS
      );
      storedData.failedAttempts = 0;
      storedData.blockedUntil = null;
      await storedData.save();
      const response = NextResponse.json({
        success: true,
        message: "Xác nhận mã PIN thành công. Vui lòng đặt mật khẩu mới.",
      });
      setResetTokenCookie(
        response,
        resetToken,
        RESET_GRANT_MS / 1000
      );
      return response;
    }

    if (action === "reset-password") {
      const passwordError = validatePassword(body.newPassword);
      if (!normalizedEmail || passwordError) {
        return NextResponse.json(
          {
            success: false,
            message: passwordError || "Thiếu email hoặc mật khẩu mới",
          },
          { status: 400 }
        );
      }
      await enforceRateLimit(
        "reset-complete:email",
        normalizedEmail,
        5,
        15 * 60 * 1000
      );

      const resetToken = request.cookies.get(RESET_TOKEN_COOKIE)?.value || "";
      const storedData = await FogetPasswordPin.findOne({
        email: normalizedEmail,
        verified: true,
        expiresAt: { $gt: new Date() },
        resetTokenExpiresAt: { $gt: new Date() },
      }).select("+resetTokenHash");
      if (
        !storedData ||
        !resetToken ||
        !safeHashEquals(hashToken(resetToken), storedData.resetTokenHash || "")
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
          },
          { status: 400 }
        );
      }

      const dbSession = await mongoose.startSession();
      try {
        await dbSession.withTransaction(
          async () => {
            const resetState = await FogetPasswordPin.findOne({
              _id: storedData._id,
              email: normalizedEmail,
              verified: true,
              expiresAt: { $gt: new Date() },
              resetTokenExpiresAt: { $gt: new Date() },
            })
              .select("+resetTokenHash")
              .session(dbSession);
            if (
              !resetState ||
              !safeHashEquals(
                hashToken(resetToken),
                resetState.resetTokenHash || ""
              )
            ) {
              throw new ResetStateError(
                "Phiên đặt lại mật khẩu đã được sử dụng"
              );
            }

            const user = await User.findOne({
              email: normalizedEmail,
              isActive: true,
            }).session(dbSession);
            if (!user) {
              throw new ResetStateError(
                "Phiên đặt lại mật khẩu không hợp lệ"
              );
            }
            user.password = body.newPassword as string;
            await user.save({ session: dbSession });
            await Session.updateMany(
              { userId: user._id, isActive: true },
              { $set: { isActive: false } },
              { session: dbSession }
            );
            const consumed = await FogetPasswordPin.deleteOne(
              { _id: resetState._id },
              { session: dbSession }
            );
            if (consumed.deletedCount !== 1) {
              throw new ResetStateError(
                "Phiên đặt lại mật khẩu đã được sử dụng"
              );
            }
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
        message: "Đặt lại mật khẩu thành công!",
      });
      setResetTokenCookie(response, "", 0);
      return response;
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ" },
      { status: 400 }
    );
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
        { success: false, message: "Dữ liệu đặt lại mật khẩu quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof ResetStateError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
