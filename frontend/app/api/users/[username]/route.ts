import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username không hợp lệ" },
        { status: 400 }
      );
    }

    const lowercaseUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(lowercaseUsername)) {
      return NextResponse.json(
        { success: false, message: "Username không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();
    const user = await User.findOne({
      username: lowercaseUsername,
      isActive: true,
    })
      .select("username role avatar socialLinks createdAt")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role || "user",
        avatar: user.avatar,
        socialLinks: user.socialLinks || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/users/[username] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
