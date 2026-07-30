import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  enforceRateLimit,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const newUsername =
      typeof body.newUsername === "string"
        ? body.newUsername.toLowerCase().trim()
        : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!/^[a-z0-9_]{3,30}$/.test(newUsername) || !password || password.length > 128) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "change-username",
      payload.userId,
      5,
      60 * 60_000
    );
    const user = await User.findById(payload.userId).select("+password");
    if (!user) {
      return NextResponse.json({ success: false, message: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không chính xác" }, { status: 400 });
    }

    // Verify username availability again
    if (newUsername !== user.username) {
      const existingUser = await User.findOne({ username: newUsername })
        .select("_id")
        .lean();
      if (existingUser) {
        return NextResponse.json({ success: false, message: "Tên đăng nhập đã tồn tại" }, { status: 400 });
      }
    }

    user.username = newUsername;
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
  } catch (error: unknown) {
    console.error("Change username error:", error);
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đã đổi username quá nhiều lần" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu thay đổi username quá lớn" },
        { status: 413 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập đã tồn tại" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: "Lỗi hệ thống" }, { status: 500 });
  }
}
