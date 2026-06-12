import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/lib/Auth";
import { getAiBackendHeaders, getAiBackendUrl } from "@/app/lib/AiBackend";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken || !verifyAccessToken(accessToken)) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để trích xuất JD" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Thiếu file JD" },
        { status: 400 }
      );
    }

    const backendForm = new FormData();
    backendForm.set("file", file);

    const response = await fetch(getAiBackendUrl("/internal/jd/extract"), {
      method: "POST",
      headers: getAiBackendHeaders(),
      body: backendForm,
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          message: errorPayload.detail || "Không thể trích xuất JD từ file",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      markdown: data.markdown,
      normalized: data.normalized,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/jd/extract error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi trích xuất JD" },
      { status: 502 }
    );
  }
}
