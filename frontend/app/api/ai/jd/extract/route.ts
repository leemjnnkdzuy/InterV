import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/app/lib/Auth";
import { AiBackendError, aiBackend } from "@/app/lib/AiBackend";
import {
  enforceRateLimit,
  isFileUpload,
  readFormDataLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

const MAX_JD_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để trích xuất JD" },
        { status: 401 }
      );
    }

    await enforceRateLimit("ai-jd-extract", payload.userId, 10, 10 * 60_000);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_JD_BYTES + 128 * 1024) {
      return NextResponse.json(
        { success: false, message: "File JD vượt quá 10 MB" },
        { status: 413 }
      );
    }
    const formData = await readFormDataLimited(
      request,
      MAX_JD_BYTES + 128 * 1024
    );
    const file = formData.get("file");
    if (!isFileUpload(file)) {
      return NextResponse.json(
        { success: false, message: "Thiếu file JD" },
        { status: 400 }
      );
    }
    if (file.size === 0 || file.size > MAX_JD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message: file.size === 0 ? "File JD rỗng" : "File JD vượt quá 10 MB",
        },
        { status: file.size === 0 ? 400 : 413 }
      );
    }

    const data = await aiBackend.extractJd({
      content: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    });
    return NextResponse.json({
      success: true,
      markdown: data.markdown,
      normalized: data.normalized,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/jd/extract error:", error);
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đã tải lên quá nhiều JD" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "File JD vượt quá 10 MB" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof AiBackendError
            ? error.message
            : "Lỗi trích xuất JD",
      },
      { status: 502 }
    );
  }
}
