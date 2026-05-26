import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { verifyAccessToken } from "@/app/lib/Auth";

export async function PUT(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy access token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Access token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const { dob, avatar, socialLinks } = await request.json();

    await connectDB();
    const user = await User.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    if (dob !== undefined) {
      user.dob = dob ? new Date(dob) : undefined;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    if (socialLinks !== undefined) {
      if (Array.isArray(socialLinks)) {
        user.socialLinks = socialLinks.map((link: any) => ({
          platform: String(link.platform || ""),
          usernameOrUrl: String(link.usernameOrUrl || ""),
        }));
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "user",
        avatar: user.avatar,
        dob: user.dob,
        socialLinks: user.socialLinks || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("PUT /api/users/update error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
