import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Session from "@/app/models/Session";
import EmailChangePin from "@/app/models/EmailChangePin";
import { authenticateRequest } from "@/app/lib/Auth";
import { generatePIN, sendChangeEmailPin } from "@/app/lib/Email";
import { MAX_PIN_ATTEMPTS, PIN_LOCK_MS } from "@/app/contants";
import {
  enforceRateLimit,
  hashOtp,
  normalizeEmail,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
  verifyOtp,
} from "@/app/lib/ServerSecurity";

class EmailChangeStateError extends Error {}

async function POSTHandler(request: NextRequest) {
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
      16 * 1024
    )) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    await connectDB();
    await enforceRateLimit(
      `change-email:${action || "invalid"}`,
      payload.userId,
      8,
      15 * 60 * 1000
    );

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    if (action === "send-current-pin") {
      const pin = generatePIN();
      const pinHash = await hashOtp(pin);
      await EmailChangePin.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          currentEmailPinHash: pinHash,
          currentEmailVerified: false,
          newEmail: null,
          newEmailPinHash: null,
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
      const result = await sendChangeEmailPin(user.email, pin, "current");
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Không thể gửi email xác thực. Vui lòng thử lại.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Mã PIN đã được gửi đến email hiện tại của bạn",
      });
    }

    if (action === "verify-current-pin") {
      const storedData = await EmailChangePin.findOne({
        userId: user._id,
        expiresAt: { $gt: new Date() },
      }).select("+currentEmailPinHash");
      if (
        !storedData ||
        (storedData.blockedUntil &&
          storedData.blockedUntil.getTime() > Date.now())
      ) {
        return NextResponse.json(
          { success: false, message: "Mã PIN không hợp lệ hoặc đang bị khóa." },
          { status: storedData?.blockedUntil ? 429 : 400 }
        );
      }
      if (!(await verifyOtp(body.pin, storedData.currentEmailPinHash))) {
        const attempts = await EmailChangePin.findOneAndUpdate(
          { _id: storedData._id },
          { $inc: { failedAttempts: 1 } },
          { returnDocument: "after" }
        );
        const shouldLock =
          (attempts?.failedAttempts || 0) >= MAX_PIN_ATTEMPTS;
        if (shouldLock) {
          await EmailChangePin.updateOne(
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
              ? "Mã PIN bị khóa do thử sai quá nhiều lần."
              : "Mã PIN không chính xác",
          },
          { status: shouldLock ? 429 : 400 }
        );
      }
      storedData.currentEmailVerified = true;
      storedData.failedAttempts = 0;
      storedData.blockedUntil = null;
      await storedData.save();
      return NextResponse.json({
        success: true,
        message: "Xác thực email hiện tại thành công",
      });
    }

    if (action === "send-new-pin") {
      const normalizedNewEmail = normalizeEmail(body.newEmail);
      if (
        !/^\S+@\S+\.\S+$/.test(normalizedNewEmail) ||
        normalizedNewEmail === user.email
      ) {
        return NextResponse.json(
          { success: false, message: "Email mới không hợp lệ" },
          { status: 400 }
        );
      }
      const [existingUser, storedData] = await Promise.all([
        User.findOne({ email: normalizedNewEmail }).select("_id").lean(),
        EmailChangePin.findOne({
          userId: user._id,
          currentEmailVerified: true,
          expiresAt: { $gt: new Date() },
        }),
      ]);
      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            message: "Email đã được sử dụng bởi một tài khoản khác",
          },
          { status: 400 }
        );
      }
      if (!storedData) {
        return NextResponse.json(
          { success: false, message: "Vui lòng xác thực email hiện tại trước" },
          { status: 400 }
        );
      }

      const pin = generatePIN();
      storedData.newEmail = normalizedNewEmail;
      storedData.newEmailPinHash = await hashOtp(pin);
      storedData.failedAttempts = 0;
      storedData.blockedUntil = null;
      storedData.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storedData.save();
      const result = await sendChangeEmailPin(normalizedNewEmail, pin, "new");
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Không thể gửi email xác thực. Vui lòng thử lại.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Mã PIN đã được gửi đến email mới của bạn",
      });
    }

    if (action === "verify-new-pin") {
      const storedData = await EmailChangePin.findOne({
        userId: user._id,
        currentEmailVerified: true,
        newEmail: { $ne: null },
        expiresAt: { $gt: new Date() },
      }).select("+newEmailPinHash");
      if (
        !storedData ||
        !storedData.newEmail ||
        (storedData.blockedUntil &&
          storedData.blockedUntil.getTime() > Date.now())
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Mã PIN không hợp lệ, đã hết hạn hoặc đang bị khóa.",
          },
          { status: storedData?.blockedUntil ? 429 : 400 }
        );
      }
      if (!(await verifyOtp(body.pin, storedData.newEmailPinHash || ""))) {
        const attempts = await EmailChangePin.findOneAndUpdate(
          { _id: storedData._id },
          { $inc: { failedAttempts: 1 } },
          { returnDocument: "after" }
        );
        const shouldLock =
          (attempts?.failedAttempts || 0) >= MAX_PIN_ATTEMPTS;
        if (shouldLock) {
          await EmailChangePin.updateOne(
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
              ? "Mã PIN bị khóa do thử sai quá nhiều lần."
              : "Mã PIN không chính xác",
          },
          { status: shouldLock ? 429 : 400 }
        );
      }

      let changedUser:
        | {
            id: string;
            username: string;
            email: string;
            role: string;
            avatar: string;
            dob?: Date;
            createdAt: Date;
          }
        | undefined;
      const dbSession = await mongoose.startSession();
      try {
        await dbSession.withTransaction(
          async () => {
            const pinRecord = await EmailChangePin.findOne({
              _id: storedData._id,
              userId: user._id,
              currentEmailVerified: true,
              newEmail: { $ne: null },
              expiresAt: { $gt: new Date() },
            })
              .select("+newEmailPinHash")
              .session(dbSession);
            if (
              !pinRecord?.newEmail ||
              (pinRecord.blockedUntil &&
                pinRecord.blockedUntil.getTime() > Date.now()) ||
              !(await verifyOtp(body.pin, pinRecord.newEmailPinHash || ""))
            ) {
              throw new EmailChangeStateError(
                "Mã PIN đã được dùng hoặc không còn hợp lệ"
              );
            }

            const account = await User.findOne({
              _id: user._id,
              isActive: true,
            }).session(dbSession);
            if (!account) {
              throw new EmailChangeStateError(
                "Tài khoản không còn hoạt động"
              );
            }
            account.email = pinRecord.newEmail;
            await account.save({ session: dbSession });
            await Session.updateMany(
              {
                userId: account._id,
                _id: { $ne: payload.sessionId },
                isActive: true,
              },
              { $set: { isActive: false } },
              { session: dbSession }
            );
            const consumed = await EmailChangePin.deleteOne(
              { _id: pinRecord._id },
              { session: dbSession }
            );
            if (consumed.deletedCount !== 1) {
              throw new EmailChangeStateError(
                "Mã PIN đã được dùng hoặc không còn hợp lệ"
              );
            }
            changedUser = {
              id: account._id.toString(),
              username: account.username,
              email: account.email,
              role: account.role || "user",
              avatar: account.avatar || "",
              dob: account.dob,
              createdAt: account.createdAt,
            };
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
      if (!changedUser) {
        throw new EmailChangeStateError(
          "Không thể hoàn tất thay đổi email"
        );
      }
      return NextResponse.json({
        success: true,
        message: "Thay đổi địa chỉ email thành công!",
        user: changedUser,
      });
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
        { success: false, message: "Dữ liệu thay đổi email quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof EmailChangeStateError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email đã được sử dụng bởi một tài khoản khác",
        },
        { status: 409 }
      );
    }
    console.error("Change email error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
