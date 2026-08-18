import { createHash } from "node:crypto";

import { withApiLogging } from "@/app/lib/ApiLogging";
import { authenticateRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { AiBackendError, aiBackend } from "@/app/lib/AiBackend";
import {
  enforceRateLimit,
  readJsonBodyLimited,
  RateLimitError,
  rateLimitResponse,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import VoicePreviewAudio from "@/app/models/VoicePreviewAudio";
import type { VoicePreviewAudioResult } from "@/app/types";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LANGUAGES = new Set(["vi-VN"]);

const globalForVoicePreview = globalThis as typeof globalThis & {
  voicePreviewInFlight?: Map<string, Promise<VoicePreviewAudioResult>>;
};

const voicePreviewInFlight =
  globalForVoicePreview.voicePreviewInFlight ??
  (globalForVoicePreview.voicePreviewInFlight = new Map());

function makeVoicePreviewKey(
  language: string,
  voiceId: string,
  text: string
): { cacheKey: string; sampleHash: string } {
  const sampleHash = createHash("sha256")
    .update(`${language}\u0000${voiceId}\u0000${text}`, "utf8")
    .digest("hex");
  return {
    cacheKey: `voice-preview:v1:${language}:${voiceId}:${sampleHash}`,
    sampleHash,
  };
}

async function getStoredVoicePreview(
  cacheKey: string
): Promise<VoicePreviewAudioResult | null> {
  const stored = await VoicePreviewAudio.findOne({ cacheKey })
    .select("+audioBase64")
    .lean();
  if (!stored?.audioBase64) return null;
  return {
    audioBase64: stored.audioBase64,
    contentType: stored.contentType || "audio/mpeg",
    cached: true,
  };
}

async function generateAndStoreVoicePreview(input: {
  cacheKey: string;
  sampleHash: string;
  language: string;
  voiceId: string;
  text: string;
}): Promise<VoicePreviewAudioResult> {
  const stored = await getStoredVoicePreview(input.cacheKey);
  if (stored) return stored;

  const data = await aiBackend.synthesizeTts({
    text: input.text,
    language: input.language,
    voiceId: input.voiceId,
  });
  const result: VoicePreviewAudioResult = {
    audioBase64: data.audio.toString("base64"),
    contentType: data.contentType || "audio/mpeg",
    cached: false,
  };

  await VoicePreviewAudio.findOneAndUpdate(
    { cacheKey: input.cacheKey },
    {
      $set: {
        language: input.language,
        voiceId: input.voiceId,
        sampleHash: input.sampleHash,
        sampleText: input.text,
        audioBase64: result.audioBase64,
        contentType: result.contentType,
      },
      $setOnInsert: { cacheKey: input.cacheKey },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return result;
}

async function POSTHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để nghe thử giọng đọc" },
        { status: 401 }
      );
    }

    await enforceRateLimit("ai-voice-preview", payload.userId, 30, 60_000);
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
      body.voiceId.length === 0 ||
      body.voiceId.length > 100
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu giọng đọc không hợp lệ" },
        { status: 400 }
      );
    }

    const text = body.text.trim();
    const language = body.language;
    const voiceId = body.voiceId;
    const { cacheKey, sampleHash } = makeVoicePreviewKey(
      language,
      voiceId,
      text
    );

    await connectDB();
    const stored = await getStoredVoicePreview(cacheKey);
    if (stored) {
      return NextResponse.json({ success: true, ...stored });
    }

    const existingRequest = voicePreviewInFlight.get(cacheKey);
    if (existingRequest) {
      const result = await existingRequest;
      return NextResponse.json({ success: true, ...result, cached: true });
    }

    const requestPromise = generateAndStoreVoicePreview({
      cacheKey,
      sampleHash,
      language,
      voiceId,
      text,
    });
    voicePreviewInFlight.set(cacheKey, requestPromise);
    try {
      const result = await requestPromise;
      return NextResponse.json({ success: true, ...result });
    } finally {
      if (voicePreviewInFlight.get(cacheKey) === requestPromise) {
        voicePreviewInFlight.delete(cacheKey);
      }
    }
  } catch (error: unknown) {
    console.error("POST /api/ai/voices/preview error:", error);
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
    const status =
      error instanceof AiBackendError && error.status === 3 ? 400 : 502;
    return NextResponse.json({ success: false, message }, { status });
  }
}

export const POST = withApiLogging(POSTHandler);
