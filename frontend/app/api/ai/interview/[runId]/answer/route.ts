import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { verifyAccessToken } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import { callAiBackend } from "@/app/lib/AiBackend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const accessToken = request.cookies.get("access_token")?.value;
    const tokenPayload = accessToken ? verifyAccessToken(accessToken) : null;
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để gửi câu trả lời" },
        { status: 401 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({ _id: runId, userId: tokenPayload.userId });
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = await callAiBackend<{ success: boolean; feedback_hint?: string }>(
      "/internal/interview/answer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run_id: runId,
          question_id: body.questionId,
          question: body.question,
          answer: body.answer,
          language: run.language || "vi-VN",
        }),
      }
    );

    return NextResponse.json({
      success: true,
      feedbackHint: data.feedback_hint,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/answer error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể gửi câu trả lời sang AI backend" },
      { status: 502 }
    );
  }
}
