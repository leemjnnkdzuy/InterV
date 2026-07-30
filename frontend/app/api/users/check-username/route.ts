import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/app/lib/ServerSecurity";

async function GETHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.toLowerCase().trim();

    if (!username || !/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập tối thiểu phải từ 3 ký tự" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit("check-username", payload.userId, 30, 60_000);
    const existingUser = await User.findOne({ username }).select("_id").lean();
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
  } catch (error: unknown) {
    console.error("Check username error:", error);
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đang kiểm tra quá nhanh" },
        rateLimitResponse(error)
      );
    }
    return NextResponse.json({ success: false, message: "Lỗi hệ thống" }, { status: 500 });
  }
}

export const GET = withApiLogging(GETHandler);
