import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import { aiBackend } from "@/app/lib/AiBackend";
import PracticeRun from "@/app/models/PracticeRun";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/app/lib/ServerSecurity";

function assemblyAiLanguageCode(locale: unknown): string {
  if (typeof locale !== "string") return "vi";
  const languageCode = locale.trim().toLowerCase().split("-")[0];
  return /^[a-z]{2,3}$/.test(languageCode) ? languageCode : "vi";
}

async function POSTHandler(
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
        { success: false, message: "Bạn cần đăng nhập để dùng realtime STT" },
        { status: 401 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
      status: "IN_PROGRESS",
    })
      .select("_id language")
      .lean();
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Lượt phỏng vấn không tồn tại hoặc đã kết thúc" },
        { status: 404 }
      );
    }

    await enforceRateLimit(
      "ai-stream-token",
      `${tokenPayload.userId}:${runId}`,
      30,
      60_000
    );
    const token = await aiBackend.createStreamingToken({
      expiresInSeconds: 60,
      maxSessionDurationSeconds: 900,
    });

    return NextResponse.json({
      success: true,
      token: token.token,
      expiresInSeconds: token.expiresInSeconds,
      websocketUrl: token.websocketUrl,
      speechModel: token.speechModel,
      languageCode: assemblyAiLanguageCode(run.language),
      sampleRate: 16_000,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/stream-token error:", error);
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đang mở microphone quá nhanh" },
        rateLimitResponse(error)
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể khởi tạo phiên nhận dạng giọng nói" },
      { status: 502 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
