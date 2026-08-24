import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";

async function GETHandler(request: NextRequest) {
  try {
    const soft = request.nextUrl.searchParams.get("soft") === "true";
    const unauthenticatedStatus = soft ? 200 : 401;
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          message: "Access token không hợp lệ hoặc đã hết hạn",
        },
        { status: unauthenticatedStatus }
      );
    }

    await connectDB();
    const user = await User.findOne({
      _id: payload.userId,
      isActive: true,
    })
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          message: "Không tìm thấy người dùng",
        },
        { status: soft ? 200 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "user",
        avatar: user.avatar,
        dob: user.dob,
        socialLinks: user.socialLinks || [],
        fullName: user.fullName || "",
        gender: user.gender || "",
        headline: user.headline || "",
        targetRole: user.targetRole || "",
        targetIndustry: user.targetIndustry || "",
        skills: user.skills || [],
        education: user.education || [],
        workExperience: user.workExperience || [],
        cvFile: user.cvFile,
        isOnboarded: user.isOnboarded ?? false,
        credits: user.credits || 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
