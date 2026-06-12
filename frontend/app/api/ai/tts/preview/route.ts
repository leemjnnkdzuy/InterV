import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/lib/Auth";
import { AiBackendError, callAiBackend } from "@/app/lib/AiBackend";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken || !verifyAccessToken(accessToken)) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để nghe thử giọng đọc" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = await callAiBackend<{
      success: boolean;
      audio_base64: string;
      content_type: string;
      cached: boolean;
    }>("/internal/tts/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        language: body.language,
        voice_id: body.voiceId,
      }),
    });

    return NextResponse.json({
      success: true,
      audioBase64: data.audio_base64,
      contentType: data.content_type,
      cached: data.cached,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/tts/preview error:", error);
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
