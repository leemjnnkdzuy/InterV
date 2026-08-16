import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/app/lib/Auth";
import { aiBackend } from "@/app/lib/AiBackend";

const SUPPORTED_LANGUAGES = new Set(["vi-VN"]);

async function GETHandler(request: NextRequest) {
  try {
    if (!(await authenticateRequest(request))) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để dùng AI voices" },
        { status: 401 }
      );
    }

    const language = request.nextUrl.searchParams.get("language") || "vi-VN";
    if (!SUPPORTED_LANGUAGES.has(language)) {
      return NextResponse.json(
        { success: false, message: "Ngôn ngữ không được hỗ trợ" },
        { status: 400 }
      );
    }
    const data = await aiBackend.listVoices(language);

    return NextResponse.json(
      {
        success: true,
        provider: "vbee",
        voices: data.voices,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    console.error("GET /api/ai/voices error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể lấy danh sách giọng đọc" },
      { status: 502 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
