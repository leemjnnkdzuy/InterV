import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import Session from "@/app/models/Session";
import { verifyRefreshToken, generateAccessToken, cookieOptions, ACCESS_TOKEN_MAX_AGE } from "@/app/lib/Auth";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy refresh token" },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      const response = NextResponse.json(
        { success: false, message: "Refresh token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );

      response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
      response.cookies.set("refresh_token", "", { ...cookieOptions, maxAge: 0 });

      return response;
    }

    if (payload.sessionId) {
      await connectDB();
      const session = await Session.findOne({
        _id: payload.sessionId,
        userId: payload.userId,
      }).lean();

      if (!session || !session.isActive) {
        const response = NextResponse.json(
          {
            success: false,
            message: "Phiên đăng nhập đã bị đăng xuất",
            sessionRevoked: true,
          },
          { status: 401 }
        );

        response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
        response.cookies.set("refresh_token", "", { ...cookieOptions, maxAge: 0 });

        return response;
      }

      await Session.updateOne(
        { _id: payload.sessionId },
        { $set: { lastActiveAt: new Date() } }
      );
    }

    const newAccessToken = generateAccessToken(payload.userId, payload.sessionId);

    const response = NextResponse.json({
      success: true,
      message: "Token đã được làm mới",
    });

    response.cookies.set("access_token", newAccessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE / 1000,
    });

    return response;
  } catch (error: any) {
    console.error("Refresh token API error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
