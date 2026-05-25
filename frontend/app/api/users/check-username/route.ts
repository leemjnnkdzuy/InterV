import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { verifyAccessToken } from "@/app/lib/Auth";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.toLowerCase().trim();

    if (!username || username.length < 3) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập tối thiểu phải từ 3 ký tự" },
        { status: 400 }
      );
    }

    await connectDB();
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập đã tồn tại" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tên đăng nhập khả dụng",
    });
  } catch (error) {
    console.error("Check username error:", error);
    return NextResponse.json({ success: false, message: "Lỗi hệ thống" }, { status: 500 });
  }
}
