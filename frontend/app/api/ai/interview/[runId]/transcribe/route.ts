import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import { aiBackend } from "@/app/lib/AiBackend";
import {
  isFileUpload,
  readFormDataLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function detectAudioType(data: Buffer): string | null {
  if (data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return "audio/webm";
  }
  if (data.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg";
  }
  if (data.length >= 12 && data.subarray(4, 8).toString("ascii") === "ftyp") {
    return "audio/mp4";
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return "audio/wav";
  }
  return null;
}

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

    const tokenPayload = await authenticateRequest(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để dùng STT" },
        { status: 401 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
      status: "IN_PROGRESS",
    })
      .select("language")
      .lean();
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }

    const formData = await readFormDataLimited(
      request,
      MAX_AUDIO_BYTES + 1024 * 1024
    );
    const file = formData.get("file");
    if (!isFileUpload(file)) {
      return NextResponse.json(
        { success: false, message: "Thiếu audio file" },
        { status: 400 }
      );
    }
    if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message:
            file.size === 0
              ? "Audio rỗng"
              : "Đoạn ghi âm vượt quá 10 MB",
        },
        { status: file.size === 0 ? 400 : 413 }
      );
    }
    const audio = Buffer.from(await file.arrayBuffer());
    const detectedContentType = detectAudioType(audio);
    if (!detectedContentType) {
      return NextResponse.json(
        { success: false, message: "Định dạng audio không được hỗ trợ" },
        { status: 415 }
      );
    }

    const data = await aiBackend.transcribeAudio({
      audio,
      filename: (file.name || "answer.webm").slice(0, 180),
      contentType: detectedContentType,
      language: run.language || "vi-VN",
    });

    return NextResponse.json({
      success: true,
      transcript: data.transcript || "",
      language: data.language,
      durationSec: data.durationSec,
      provider: data.provider,
      message: data.message,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/transcribe error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Đoạn ghi âm vượt quá 10 MB" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý STT" },
      { status: 502 }
    );
  }
}
