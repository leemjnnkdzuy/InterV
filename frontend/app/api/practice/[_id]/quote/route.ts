import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import User from "@/app/models/User";
import PracticeSession from "@/app/models/PracticeSession";
import { calculatePracticeQuote } from "@/app/lib/PracticeBilling";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

async function POSTHandler(
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

    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Access token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const duration = Number(body.duration);
    const hasUploadedJdFile = body.hasUploadedJdFile === true;
    if (!Number.isInteger(duration) || duration < 5 || duration > 25) {
      return NextResponse.json(
        { success: false, message: "Số câu hỏi không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const [user, session] = await Promise.all([
      User.findById(payload.userId).select("credits").lean(),
      PracticeSession.findOne({ _id, userId: payload.userId })
        .select("_id source questionCount")
        .lean(),
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

    const quote =
      session.source === "recruitment"
        ? {
            totalCredits: 0,
            vndEquivalent: 0,
            balanceCredits: user.credits || 0,
            remainingCredits: user.credits || 0,
            canAfford: true,
            breakdown: [
              {
                key: "recruitment",
                label: "Phỏng vấn do nhà tuyển dụng tài trợ",
                credits: 0,
              },
            ],
          }
        : calculatePracticeQuote({
            duration,
            hasUploadedJdFile,
            balanceCredits: user.credits || 0,
          });

    return NextResponse.json({ success: true, quote });
  } catch (error: unknown) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu báo giá quá lớn" },
        { status: 413 }
      );
    }
    console.error("POST /api/practice/[id]/quote error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tính chi phí luyện tập" },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
