import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import Session from "@/app/models/Session";
import { verifyAccessToken, cookieOptions } from "@/app/lib/Auth";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      if (payload && payload.sessionId) {
        await connectDB();
        await Session.updateOne(
          { sessionId: payload.sessionId },
          { $set: { isActive: false } }
        );
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công",
    });

    response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set("refresh_token", "", { ...cookieOptions, maxAge: 0 });

    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
