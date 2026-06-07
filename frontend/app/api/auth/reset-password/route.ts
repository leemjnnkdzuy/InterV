import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import FogetPasswordPin from "@/app/models/FogetPasswordPin";
import { generatePIN, sendPasswordResetEmail } from "@/app/lib/Email";
import { MAX_PIN_ATTEMPTS, PIN_LOCK_MS } from "@/app/contants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, pin, newPassword } = body;
    const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    await connectDB();

    if (action === "send-pin") {
      if (!email) {
        return NextResponse.json({ success: false, message: "Vui lòng nhập email" }, { status: 400 });
      }

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy tài khoản với email này" },
          { status: 400 }
        );
      }

      const newPin = generatePIN();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await FogetPasswordPin.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          pin: newPin,
          verified: false,
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

      const result = await sendPasswordResetEmail(normalizedEmail, newPin);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "Mã PIN đã gửi đến email của bạn",
        });
      } else {
        return NextResponse.json(
          { success: false, message: "Không thể gửi email. Vui lòng thử lại sau." },
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

      const storedData = await FogetPasswordPin.findOne({ email: normalizedEmail });

      if (!storedData) {
        return NextResponse.json(
          { success: false, message: "Mã PIN đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã." },
          { status: 400 }
        );
      }

      if (storedData.expiresAt.getTime() < Date.now()) {
        await FogetPasswordPin.deleteOne({ email: normalizedEmail });
        return NextResponse.json(
          { success: false, message: "Mã PIN đã hết hạn. Vui lòng gửi lại mã." },
          { status: 400 }
        );
      }

      if (storedData.blockedUntil && storedData.blockedUntil.getTime() > Date.now()) {
        return NextResponse.json(
          { success: false, message: "Mã PIN bị khóa do thử sai nhiều lần. Vui lòng đợi 10 phút." },
          { status: 429 }
        );
      }

      if (storedData.pin !== pin) {
        const nextAttempts = (storedData.failedAttempts || 0) + 1;
        const shouldLock = nextAttempts >= MAX_PIN_ATTEMPTS;

        await FogetPasswordPin.updateOne(
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
              ? "Bạn đã nhập sai mã PIN quá nhiều lần. Vui lòng thử lại sau 10 phút."
              : "Mã PIN không đúng. Vui lòng thử lại.",
          },
          { status: shouldLock ? 429 : 400 }
        );
      }

      storedData.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      storedData.verified = true;
      storedData.failedAttempts = 0;
      storedData.blockedUntil = null;
      await storedData.save();

      return NextResponse.json({
        success: true,
        message: "Xác nhận mã PIN thành công. Vui lòng đặt mật khẩu mới.",
      });
    }

    if (action === "reset-password") {
      if (!email || !newPassword) {
        return NextResponse.json(
          { success: false, message: "Thiếu email hoặc mật khẩu mới" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu phải từ 6 ký tự trở lên" },
          { status: 400 }
        );
      }

      const storedData = await FogetPasswordPin.findOne({ email: normalizedEmail });

      if (!storedData || !storedData.verified) {
        return NextResponse.json(
          { success: false, message: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." },
          { status: 400 }
        );
      }

      if (storedData.expiresAt.getTime() < Date.now()) {
        await FogetPasswordPin.deleteOne({ email: normalizedEmail });
        return NextResponse.json(
          { success: false, message: "Phiên đã hết hạn. Vui lòng yêu cầu lại mã PIN mới." },
          { status: 400 }
        );
      }

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản" }, { status: 404 });
      }

      user.password = newPassword;
      await user.save();

      await FogetPasswordPin.deleteOne({ email: normalizedEmail });

      return NextResponse.json({
        success: true,
        message: "Đặt lại mật khẩu thành công!",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
