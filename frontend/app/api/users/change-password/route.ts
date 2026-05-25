import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { verifyAccessToken } from "@/app/lib/Auth";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu mới phải có tối thiểu 6 ký tự" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không chính xác" }, { status: 400 });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Thay đổi mật khẩu thành công!",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ success: false, message: "Lỗi hệ thống" }, { status: 500 });
  }
}
