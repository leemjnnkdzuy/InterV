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
    const { newUsername, password } = body;

    if (!newUsername || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    const normalizedNewUsername = newUsername.toLowerCase().trim();

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ success: false, message: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không chính xác" }, { status: 400 });
    }

    // Verify username availability again
    if (normalizedNewUsername !== user.username) {
      const existingUser = await User.findOne({ username: normalizedNewUsername });
      if (existingUser) {
        return NextResponse.json({ success: false, message: "Tên đăng nhập đã tồn tại" }, { status: 400 });
      }
    }

    user.username = normalizedNewUsername;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Thay đổi tên đăng nhập thành công!",
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
  } catch (error) {
    console.error("Change username error:", error);
    return NextResponse.json({ success: false, message: "Lỗi hệ thống" }, { status: 500 });
  }
}
