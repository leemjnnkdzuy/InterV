import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { verifyAccessToken } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import { getAiBackendHeaders, getAiBackendUrl } from "@/app/lib/AiBackend";

export async function POST(
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

    const accessToken = request.cookies.get("access_token")?.value;
    const tokenPayload = accessToken ? verifyAccessToken(accessToken) : null;
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để dùng STT" },
        { status: 401 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({ _id: runId, userId: tokenPayload.userId }).select("language").lean();
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Thiếu audio file" },
        { status: 400 }
      );
    }

    const backendForm = new FormData();
    backendForm.set("file", file);
    backendForm.set("language", run.language || "vi-VN");

    const response = await fetch(getAiBackendUrl("/internal/interview/transcribe"), {
      method: "POST",
      headers: getAiBackendHeaders(),
      body: backendForm,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.detail || "Không thể chuyển giọng nói thành văn bản" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      transcript: data.transcript || "",
      language: data.language,
      durationSec: data.duration_sec,
      provider: data.provider,
      message: data.message,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/transcribe error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý STT" },
      { status: 502 }
    );
  }
}
