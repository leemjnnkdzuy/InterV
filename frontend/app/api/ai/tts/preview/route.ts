import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/app/lib/Auth";
import { AiBackendError, aiBackend } from "@/app/lib/AiBackend";
import {
  enforceRateLimit,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

const SUPPORTED_LANGUAGES = new Set(["vi-VN", "en-US", "zh-CN"]);

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để nghe thử giọng đọc" },
        { status: 401 }
      );
    }

    await enforceRateLimit("ai-tts-preview", payload.userId, 90, 60_000);
    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    if (
      typeof body.text !== "string" ||
      body.text.trim().length === 0 ||
      body.text.length > 500 ||
      typeof body.language !== "string" ||
      !SUPPORTED_LANGUAGES.has(body.language) ||
      typeof body.voiceId !== "string" ||
      body.voiceId.length > 100
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu giọng đọc không hợp lệ" },
        { status: 400 }
      );
    }
    const data = await aiBackend.synthesizeTts({
      text: body.text.trim(),
      language: body.language,
      voiceId: body.voiceId,
    });

    return NextResponse.json({
      success: true,
      audioBase64: data.audio.toString("base64"),
      contentType: data.contentType,
      cached: data.cached,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/tts/preview error:", error);
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đang yêu cầu giọng đọc quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu giọng đọc quá lớn" },
        { status: 413 }
      );
    }
    const message =
      error instanceof AiBackendError
        ? error.message
        : "Không thể tạo audio nghe thử";
    return NextResponse.json(
      { success: false, message },
      { status: 502 }
    );
  }
}
