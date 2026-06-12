import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/lib/Auth";
import { callAiBackend } from "@/app/lib/AiBackend";

interface AiVoice {
  id: string;
  name: string;
  locale: string;
  gender?: string;
  description?: string;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken || !verifyAccessToken(accessToken)) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để dùng AI voices" },
        { status: 401 }
      );
    }

    const language = request.nextUrl.searchParams.get("language") || "vi-VN";
    const data = await callAiBackend<{ success: boolean; voices: AiVoice[] }>(
      `/internal/voices?language=${encodeURIComponent(language)}`
    );

    return NextResponse.json({
      success: true,
      voices: data.voices,
    });
  } catch (error: unknown) {
    console.error("GET /api/ai/voices error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy danh sách giọng đọc" },
      { status: 502 }
    );
  }
}
