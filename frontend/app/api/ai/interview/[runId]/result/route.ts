import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import { normalizeInterviewQuestionCount } from "@/app/lib/PracticeBilling";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    if (!runId || !/^[0-9a-fA-F]{24}$/.test(runId)) {
      return NextResponse.json(
        { success: false, message: "Run ID không hợp lệ" },
        { status: 400 }
      );
    }

    const tokenPayload = await authenticateRequest(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để xem kết quả" },
        { status: 401 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
    })
      .select(
        "sessionId status evaluation questionCount answers createdAt updatedAt"
      )
      .lean();
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }

    if (run.status !== "COMPLETED" || !run.evaluation) {
      return NextResponse.json(
        { success: false, message: "Kết quả phỏng vấn chưa sẵn sàng" },
        { status: 409 }
      );
    }

    const session = await PracticeSession.findOne({
      _id: run.sessionId,
      userId: tokenPayload.userId,
    })
      .select("title industry difficulty")
      .lean();

    return NextResponse.json({
      success: true,
      run: {
        id: runId,
        practiceId: run.sessionId.toString(),
        title: session?.title || "Interview",
        industry: session?.industry || "",
        difficulty: session?.difficulty || "",
        status: run.status,
        answeredCount: run.answers.length,
        questionCount: normalizeInterviewQuestionCount(run.questionCount),
        result: run.evaluation,
        completedAt: run.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/ai/interview/[runId]/result error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải kết quả phỏng vấn" },
      { status: 500 }
    );
  }
}
