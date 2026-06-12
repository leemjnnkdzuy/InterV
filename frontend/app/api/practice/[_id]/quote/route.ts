import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { verifyAccessToken } from "@/app/lib/Auth";
import User from "@/app/models/User";
import PracticeSession from "@/app/models/PracticeSession";
import { calculatePracticeQuote } from "@/app/lib/PracticeBilling";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

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

    const body = await request.json();
    const { duration, hasUploadedJdFile } = body;

    await connectDB();

    const [user, session] = await Promise.all([
      User.findById(payload.userId).select("credits").lean(),
      PracticeSession.findOne({ _id, userId: payload.userId }).select("_id").lean(),
    ]);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const quote = calculatePracticeQuote({
      duration,
      hasUploadedJdFile: Boolean(hasUploadedJdFile),
      balanceCredits: user.credits || 0,
    });

    return NextResponse.json({ success: true, quote });
  } catch (error: unknown) {
    console.error("POST /api/practice/[id]/quote error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tính chi phí luyện tập" },
      { status: 500 }
    );
  }
}
