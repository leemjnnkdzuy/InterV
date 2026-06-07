import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import EmailChangePin from "@/app/models/EmailChangePin";
import { verifyAccessToken } from "@/app/lib/Auth";
import { generatePIN, sendChangeEmailPin } from "@/app/lib/Email";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, pin, newEmail } = body;

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (action === "send-current-pin") {
      const currentPin = generatePIN();
      
      await EmailChangePin.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          currentEmailPin: currentPin,
          currentEmailVerified: false,
          newEmail: null,
          newEmailPin: null,
          expiresAt,
        },
        { upsert: true, returnDocument: 'after' }
      );

      const emailResult = await sendChangeEmailPin(user.email, currentPin, "current");
      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, message: "Không thể gửi email xác thực. Vui lòng thử lại." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Mã PIN đã được gửi đến email hiện tại của bạn",
      });
    }

    if (action === "verify-current-pin") {
      if (!pin) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập mã PIN" },
          { status: 400 }
        );
      }

      const storedData = await EmailChangePin.findOne({ userId: user._id });
      if (!storedData || storedData.expiresAt.getTime() < Date.now()) {
        return NextResponse.json(
          { success: false, message: "Mã PIN đã hết hạn hoặc không tồn tại. Vui lòng gửi lại." },
          { status: 400 }
        );
      }

      if (storedData.currentEmailPin !== pin) {
        return NextResponse.json(
          { success: false, message: "Mã PIN không chính xác" },
          { status: 400 }
        );
      }

      storedData.currentEmailVerified = true;
      await storedData.save();

      return NextResponse.json({
        success: true,
        message: "Xác thực email hiện tại thành công",
      });
    }

    if (action === "send-new-pin") {
      if (!newEmail) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập email mới" },
          { status: 400 }
        );
      }

      const normalizedNewEmail = newEmail.toLowerCase().trim();
      if (normalizedNewEmail === user.email) {
        return NextResponse.json(
          { success: false, message: "Email mới không được trùng với email hiện tại" },
          { status: 400 }
        );
      }

      // Check if email already taken
      const existingUser = await User.findOne({ email: normalizedNewEmail });
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "Email đã được sử dụng bởi một tài khoản khác" },
          { status: 400 }
        );
      }

      const storedData = await EmailChangePin.findOne({ userId: user._id });
      if (!storedData || !storedData.currentEmailVerified) {
        return NextResponse.json(
          { success: false, message: "Vui lòng xác thực email hiện tại trước" },
          { status: 400 }
        );
      }

      const newPin = generatePIN();
      storedData.newEmail = normalizedNewEmail;
      storedData.newEmailPin = newPin;
      storedData.expiresAt = expiresAt;
      await storedData.save();

      const emailResult = await sendChangeEmailPin(normalizedNewEmail, newPin, "new");
      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, message: "Không thể gửi email xác thực. Vui lòng thử lại." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Mã PIN đã được gửi đến email mới của bạn",
      });
    }

    if (action === "verify-new-pin") {
      if (!pin) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập mã PIN" },
          { status: 400 }
        );
      }

      const storedData = await EmailChangePin.findOne({ userId: user._id });
      if (!storedData || !storedData.currentEmailVerified || !storedData.newEmail) {
        return NextResponse.json(
          { success: false, message: "Vui lòng thực hiện các bước trước đó trước" },
          { status: 400 }
        );
      }

      if (storedData.expiresAt.getTime() < Date.now()) {
        return NextResponse.json(
          { success: false, message: "Mã PIN đã hết hạn. Vui lòng yêu cầu lại." },
          { status: 400 }
        );
      }

      if (storedData.newEmailPin !== pin) {
        return NextResponse.json(
          { success: false, message: "Mã PIN không chính xác" },
          { status: 400 }
        );
      }

      // Perform update
      user.email = storedData.newEmail;
      await user.save();

      await EmailChangePin.deleteOne({ userId: user._id });

      return NextResponse.json({
        success: true,
        message: "Thay đổi địa chỉ email thành công!",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role || "user",
          avatar: user.avatar,
          dob: user.dob,
          createdAt: user.createdAt,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Change email error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
