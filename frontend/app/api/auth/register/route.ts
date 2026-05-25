import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import RegisterPin from "@/app/models/RegisterPin";
import { generatePIN, sendVerificationEmail } from "@/app/lib/Email";
import { defaultAvatars } from "@/app/assets";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, username, password, pin } = body;

    await connectDB();

    if (action === "send-pin") {
      if (!email || !username || !password) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập đầy đủ thông tin" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const normalizedUsername = username.toLowerCase().trim();

      // Check existing user
      const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
      });

      if (existingUser) {
        const message =
          existingUser.email === normalizedEmail
            ? "Email đã được sử dụng"
            : "Tên đăng nhập đã tồn tại";
        return NextResponse.json({ success: false, message }, { status: 400 });
      }

      const newPin = generatePIN();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await RegisterPin.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          username: normalizedUsername,
          password,
          pin: newPin,
          failedAttempts: 0,
          blockedUntil: null,
          expiresAt,
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        }
      );

      const emailResult = await sendVerificationEmail(normalizedEmail, newPin, username);

      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: "Mã PIN đã được gửi đến email của bạn",
        });
      } else {
        return NextResponse.json(
          { success: false, message: "Không thể gửi email xác thực. Vui lòng thử lại." },
          { status: 500 }
        );
      }
    }

    if (action === "verify-pin") {
      if (!email || !pin) {
        return NextResponse.json(
          { success: false, message: "Thiếu email hoặc mã PIN" },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();
      const storedData = await RegisterPin.findOne({ email: normalizedEmail });

      if (!storedData) {
        return NextResponse.json(
          { success: false, message: "Mã PIN đã hết hạn hoặc không tồn tại" },
          { status: 400 }
        );
      }

      if (storedData.expiresAt.getTime() < Date.now()) {
        await RegisterPin.deleteOne({ email: normalizedEmail });
        return NextResponse.json(
          { success: false, message: "Mã PIN đã hết hạn. Vui lòng yêu cầu mã mới." },
          { status: 400 }
        );
      }

      if (storedData.blockedUntil && storedData.blockedUntil.getTime() > Date.now()) {
        return NextResponse.json(
          { success: false, message: "Bạn đã nhập sai mã PIN quá nhiều lần. Vui lòng thử lại sau." },
          { status: 429 }
        );
      }

      if (storedData.pin !== pin) {
        const nextAttempts = (storedData.failedAttempts || 0) + 1;
        const shouldLock = nextAttempts >= MAX_PIN_ATTEMPTS;

        await RegisterPin.updateOne(
          { email: normalizedEmail },
          {
            $set: {
              failedAttempts: shouldLock ? 0 : nextAttempts,
              blockedUntil: shouldLock ? new Date(Date.now() + PIN_LOCK_MS) : null,
            },
          }
        );

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

      try {
        // Select a random default avatar
        const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
        const selectedAvatar = defaultAvatars[randomIndex];
        const avatarDataURI = `data:${selectedAvatar.image.mime};base64,${selectedAvatar.image.data}`;

        await User.create({
          username: storedData.username,
          email: storedData.email,
          password: storedData.password,
          avatar: avatarDataURI,
          isVerified: true,
          isActive: true,
        });

        await RegisterPin.deleteOne({ email: normalizedEmail });

        return NextResponse.json({
          success: true,
          message: "Đăng ký tài khoản thành công!",
        });
      } catch (err: any) {
        console.error("User creation error:", err);
        if (err.code === 11000) {
          return NextResponse.json(
            { success: false, message: "Email hoặc tên đăng nhập đã được sử dụng" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, message: "Lỗi tạo tài khoản. Vui lòng thử lại sau." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("Registration API error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
