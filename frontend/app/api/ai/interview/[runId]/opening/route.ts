import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

interface OpeningPayload {
  prompt?: unknown;
  transcript?: unknown;
  durationSec?: unknown;
  assemblySessionId?: unknown;
  transcriptionProvider?: unknown;
}

function stringValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }

    const body = (await readJsonBodyLimited(
      request,
      32 * 1024
    )) as OpeningPayload;
    const prompt = stringValue(body.prompt, 1_000);
    const transcript = stringValue(body.transcript, 20_000);
    const assemblySessionId = stringValue(body.assemblySessionId, 128);
    const transcriptionProvider = stringValue(
      body.transcriptionProvider,
      40
    );
    const durationValue = Number(body.durationSec);
    const durationSec =
      Number.isFinite(durationValue) && durationValue >= 0 && durationValue <= 900
        ? durationValue
        : undefined;

    if (
      !prompt ||
      !transcript ||
      !transcriptionProvider ||
      !["manual", "assemblyai", "faster-whisper"].includes(
        transcriptionProvider
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu phần giới thiệu không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
    }).select("status candidateIntro");
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }
    if (run.candidateIntro?.transcript) {
      return NextResponse.json({ success: true, alreadySaved: true });
    }
    if (run.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, message: "Lượt phỏng vấn không còn nhận phần giới thiệu" },
        { status: 409 }
      );
    }

    const saved = await PracticeRun.updateOne(
      {
        _id: runId,
        userId: tokenPayload.userId,
        status: "IN_PROGRESS",
        $or: [
          { candidateIntro: { $exists: false } },
          { "candidateIntro.transcript": "" },
        ],
      },
      {
        $set: {
          candidateIntro: {
            prompt,
            transcript,
            audioDurationSec: durationSec,
            assemblySessionId,
            transcriptionProvider,
            createdAt: new Date(),
          },
        },
      }
    );
    if (saved.modifiedCount !== 1) {
      return NextResponse.json({ success: true, alreadySaved: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/opening error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu phần giới thiệu quá lớn" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Không thể lưu phần giới thiệu" },
      { status: 502 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
