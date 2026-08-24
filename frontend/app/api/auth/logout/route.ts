import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import Session from "@/app/models/Session";
import { verifyAccessToken, verifyRefreshToken, cookieOptions } from "@/app/lib/Auth";

async function POSTHandler(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;

    let sessionId: string | undefined;
    let userId: string | undefined;

    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      if (payload?.sessionId) {
        sessionId = payload.sessionId;
        userId = payload.userId;
      }
    }

    if (!sessionId && refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      if (payload?.sessionId) {
        sessionId = payload.sessionId;
        userId = payload.userId;
      }
    }

    if (sessionId && userId) {
      await connectDB();
      await Session.updateOne(
        { _id: sessionId, userId },
        { $set: { isActive: false } }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công",
    });

    response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set("refresh_token", "", { ...cookieOptions, maxAge: 0 });

    return response;
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
