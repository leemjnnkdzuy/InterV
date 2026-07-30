import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import RegisterPin from "@/app/models/RegisterPin";
import CreditLog from "@/app/models/CreditLog";
import Transaction from "@/app/models/Transaction";
import { generatePIN, sendVerificationEmail } from "@/app/lib/Email";
import { defaultAvatars } from "@/app/assets";
import { MAX_PIN_ATTEMPTS, PIN_LOCK_MS } from "@/app/contants";
import {
  enforceRateLimit,
  getClientIp,
  hashOtp,
  normalizeEmail,
  normalizeUsername,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
  validatePassword,
  verifyOtp,
} from "@/app/lib/ServerSecurity";
import { createOrderCode } from "@/app/lib/PaymentSettlement";

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

class RegistrationStateError extends Error {}

async function POSTHandler(request: NextRequest) {
  try {
    const body = (await readJsonBodyLimited(
      request,
      16 * 1024
    )) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const normalizedEmail = normalizeEmail(body.email);
    const normalizedUsername = normalizeUsername(body.username);
    const clientIp = getClientIp(request);

    await connectDB();

    if (action === "send-pin") {
      const password =
        typeof body.password === "string" ? body.password : "";
      const passwordError = validatePassword(password);
      if (
        !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
        !/^[a-z0-9_]{3,30}$/.test(normalizedUsername) ||
        passwordError
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              passwordError ||
              "Email hoặc username không đúng định dạng cho phép",
          },
          { status: 400 }
        );
      }

      await Promise.all([
        enforceRateLimit("register:ip", clientIp, 5, 60 * 60 * 1000),
        enforceRateLimit(
          "register:email",
          normalizedEmail,
          3,
          15 * 60 * 1000
        ),
      ]);

      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { username: normalizedUsername },
        ],
      })
        .select("email")
        .lean();
      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            message:
              existingUser.email === normalizedEmail
                ? "Email đã được sử dụng"
                : "Tên đăng nhập đã tồn tại",
          },
          { status: 400 }
        );
      }

      const pin = generatePIN();
      const [pinHash, passwordHash] = await Promise.all([
        hashOtp(pin),
        bcrypt.hash(password, 12),
      ]);
      await RegisterPin.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          username: normalizedUsername,
          passwordHash,
          pinHash,
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

      const emailResult = await sendVerificationEmail(
        normalizedEmail,
        pin,
        normalizedUsername
      );
      if (!emailResult.success) {
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
        message: "Mã PIN đã được gửi đến email của bạn",
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
        enforceRateLimit("register-verify:ip", clientIp, 20, 10 * 60 * 1000),
        enforceRateLimit(
          "register-verify:email",
          normalizedEmail,
          10,
          10 * 60 * 1000
        ),
      ]);

      const storedData = await RegisterPin.findOne({
        email: normalizedEmail,
      }).select("+pinHash +passwordHash");
      if (!storedData || storedData.expiresAt.getTime() < Date.now()) {
        await RegisterPin.deleteOne({ email: normalizedEmail });
        return NextResponse.json(
          {
            success: false,
            message: "Mã PIN đã hết hạn hoặc không tồn tại",
          },
          { status: 400 }
        );
      }
      if (
        storedData.blockedUntil &&
        storedData.blockedUntil.getTime() > Date.now()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Mã PIN đang bị khóa. Vui lòng thử lại sau.",
          },
          { status: 429 }
        );
      }

      if (!(await verifyOtp(body.pin, storedData.pinHash))) {
        const attempts = await RegisterPin.findOneAndUpdate(
          { _id: storedData._id },
          { $inc: { failedAttempts: 1 } },
          { returnDocument: "after" }
        );
        const shouldLock =
          (attempts?.failedAttempts || 0) >= MAX_PIN_ATTEMPTS;
        if (shouldLock) {
          await RegisterPin.updateOne(
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
              : "Mã PIN không chính xác",
          },
          { status: shouldLock ? 429 : 400 }
        );
      }

      const selectedAvatar =
        defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
      const avatarDataURI = `data:${selectedAvatar.image.mime};base64,${selectedAvatar.image.data}`;
      const dbSession = await mongoose.startSession();
      try {
        await dbSession.withTransaction(
          async () => {
            const pinRecord = await RegisterPin.findOne({
              _id: storedData._id,
              email: normalizedEmail,
              expiresAt: { $gt: new Date() },
            })
              .select("+pinHash +passwordHash")
              .session(dbSession);
            if (
              !pinRecord ||
              !(await verifyOtp(body.pin, pinRecord.pinHash))
            ) {
              throw new RegistrationStateError(
                "Mã PIN đã được dùng hoặc không còn hợp lệ"
              );
            }

            const newUser = new User({
              username: pinRecord.username,
              email: pinRecord.email,
              password: pinRecord.passwordHash,
              avatar: avatarDataURI,
              isVerified: true,
              isActive: true,
              credits: 500,
            });
            newUser.$locals.passwordAlreadyHashed = true;
            await newUser.save({ session: dbSession });
            await CreditLog.create(
              [
                {
                  userId: newUser._id,
                  credits: 500,
                  action: "REGISTER_BONUS",
                  description: "Quà tặng đăng ký tài khoản mới",
                },
              ],
              { session: dbSession }
            );
            await Transaction.create(
              [
                {
                  userId: newUser._id,
                  orderCode: createOrderCode(),
                  amount: 0,
                  credits: 500,
                  status: "PAID",
                  paymentLinkId: "REGISTER_BONUS",
                  paymentUrl: "",
                },
              ],
              { session: dbSession }
            );
            const consumed = await RegisterPin.deleteOne(
              { _id: pinRecord._id },
              { session: dbSession }
            );
            if (consumed.deletedCount !== 1) {
              throw new RegistrationStateError(
                "Mã PIN đã được dùng hoặc không còn hợp lệ"
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

      return NextResponse.json({
        success: true,
        message: "Đăng ký tài khoản thành công!",
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
        { success: false, message: "Dữ liệu đăng ký quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof RegistrationStateError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 409 }
      );
    }
    console.error("Registration API error:", error);
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "Email hoặc tên đăng nhập đã được sử dụng",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
