import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import Session from "@/app/models/Session";
import { verifyAccessToken, cookieOptions } from "@/app/lib/Auth";

export async function GET(request: NextRequest) {
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
        { success: false, message: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    await connectDB();

    const sessions = await Session.find({
      userId: payload.userId,
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    const currentSessionId = payload.sessionId;

    const sessionList = sessions.map((s: any) => ({
      id: s._id.toString(),
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isActive: s.isActive,
      isCurrent: s._id.toString() === currentSessionId,
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionList,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
        { success: false, message: "Token không hợp lệ" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, revokeAll } = body;

    await connectDB();

    if (revokeAll) {
      // Log out all sessions of the user
      await Session.updateMany(
        { userId: payload.userId, isActive: true },
        { $set: { isActive: false } }
      );

      const response = NextResponse.json({
        success: true,
        message: "Đã đăng xuất khỏi tất cả thiết bị",
      });

      response.cookies.set("access_token", "", { ...cookieOptions, maxAge: 0 });
      response.cookies.set("refresh_token", "", { ...cookieOptions, maxAge: 0 });

      return response;
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Thiếu sessionId" },
        { status: 400 }
      );
    }

    // Prevent revoking current session directly (user should use standard logout instead)
    if (sessionId === payload.sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Không thể đăng xuất phiên hiện tại từ đây. Vui lòng dùng chức năng Đăng xuất.",
        },
        { status: 400 }
      );
    }

    // Set target session as inactive
    const result = await Session.updateOne(
      {
        _id: sessionId,
        userId: payload.userId,
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy phiên hoặc phiên đã bị đăng xuất",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã đăng xuất thiết bị thành công",
    });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}
