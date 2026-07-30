import { withApiLogging } from "@/app/lib/ApiLogging";
import { after, NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import type { GrpcQaPair } from "@/app/lib/AiBackend";
import { generateInterviewLookahead } from "@/app/lib/InterviewLookahead";
import PracticeAudio from "@/app/models/PracticeAudio";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import { normalizeInterviewQuestionCount } from "@/app/lib/PracticeBilling";
import {
  isFileUpload,
  readFormDataLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

export const maxDuration = 180;

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_RUN_AUDIO_BYTES = 150 * 1024 * 1024;
const TRANSCRIPTION_PROVIDERS = new Set([
  "manual",
  "assemblyai",
  "faster-whisper",
]);

function formString(formData: FormData, key: string, maxLength: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isSupportedAudio(buffer: Buffer, contentType: string): boolean {
  if (contentType.includes("webm")) {
    return buffer.subarray(0, 4).equals(
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3])
    );
  }
  if (contentType.includes("mp4") || contentType.includes("m4a")) {
    return (
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp"
    );
  }
  if (contentType.includes("ogg")) {
    return buffer.subarray(0, 4).toString("ascii") === "OggS";
  }
  return false;
}

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    if (!/^[0-9a-fA-F]{24}$/.test(runId || "")) {
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
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu câu trả lời quá lớn" },
        { status: 413 }
      );
    }

    const formData = await readFormDataLimited(
      request,
      MAX_AUDIO_BYTES + 1024 * 1024
    );
    const questionId = formString(formData, "questionId", 64);
    const answer = formString(formData, "answer", 20_001);
    const assemblySessionId = formString(
      formData,
      "assemblySessionId",
      128
    );
    const transcriptionProvider =
      formString(formData, "transcriptionProvider", 40) || "manual";
    const durationValue = Number(formString(formData, "durationSec", 20));
    const durationSec =
      Number.isFinite(durationValue) &&
      durationValue >= 0 &&
      durationValue <= 900
        ? durationValue
        : undefined;
    const audioFile = formData.get("audio");

    if (
      !/^q_\d{1,2}$/.test(questionId) ||
      !answer ||
      answer.length > 20_000 ||
      !TRANSCRIPTION_PROVIDERS.has(transcriptionProvider)
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu câu trả lời không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const run = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
    });
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }
    if (run.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, message: "Lượt phỏng vấn không còn nhận câu trả lời" },
        { status: 409 }
      );
    }

    const questionCount = normalizeInterviewQuestionCount(run.questionCount);
    const existingIndex = run.answers.findIndex(
      (item) => item.questionId === questionId
    );
    if (existingIndex >= 0) {
      const nextIndex = existingIndex + 1;
      const nextQuestion = run.questions[nextIndex] || null;
      return NextResponse.json({
        success: true,
        completed: nextIndex >= questionCount,
        answeredCount: Math.max(run.answers.length, nextIndex),
        questionCount,
        nextQuestion,
        idempotentReplay: true,
      });
    }

    const currentIndex = run.answers.length;
    const currentQuestion = run.questions[currentIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Câu trả lời không đúng thứ tự của lượt phỏng vấn",
        },
        { status: 409 }
      );
    }
    const session = await PracticeSession.findOne({
      _id: run.sessionId,
      userId: tokenPayload.userId,
    });
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    let audioId;
    if (isFileUpload(audioFile) && audioFile.size > 0) {
      if (
        audioFile.size > MAX_AUDIO_BYTES ||
        !audioFile.type.startsWith("audio/")
      ) {
        return NextResponse.json(
          { success: false, message: "Đoạn ghi âm không hợp lệ hoặc quá lớn" },
          { status: 415 }
        );
      }
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      if (!isSupportedAudio(audioBuffer, audioFile.type)) {
        return NextResponse.json(
          { success: false, message: "Chữ ký file audio không hợp lệ" },
          { status: 415 }
        );
      }
      const totals = await PracticeAudio.aggregate<{ total: number }>([
        { $match: { runId: run._id, userId: run.userId } },
        { $group: { _id: null, total: { $sum: "$sizeBytes" } } },
      ]);
      if ((totals[0]?.total || 0) + audioBuffer.length > MAX_RUN_AUDIO_BYTES) {
        return NextResponse.json(
          { success: false, message: "Tổng dung lượng ghi âm đã vượt giới hạn" },
          { status: 413 }
        );
      }
      const audio = await PracticeAudio.findOneAndUpdate(
        { runId: run._id, questionId },
        {
          $set: {
            userId: tokenPayload.userId,
            sessionId: run.sessionId,
            mimeType: audioFile.type,
            audioData: audioBuffer,
            sizeBytes: audioBuffer.length,
            durationSec,
            assemblySessionId,
            transcript: answer,
          },
          $unset: { audioBase64: "" },
        },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
      audioId = audio._id;
    }

    const answerRecord = {
      questionId,
      question: currentQuestion.text,
      transcript: answer,
      editedAnswer: answer,
      audioDurationSec: durationSec,
      audioId,
      assemblySessionId,
      transcriptionProvider,
      groundingIds: currentQuestion.groundingIds || [],
    };
    const qaHistory: GrpcQaPair[] = [
      ...run.answers.map((item) => ({
        questionId: item.questionId,
        question: item.question,
        answer: item.editedAnswer || item.transcript,
        groundingIds:
          run.questions.find((question) => question.id === item.questionId)
            ?.groundingIds || [],
      })),
      {
        questionId,
        question: currentQuestion.text,
        answer,
        groundingIds: currentQuestion.groundingIds || [],
      },
    ];
    const nextQuestionIndex = currentIndex + 1;
    const nextQuestionId = run.questions[nextQuestionIndex]?.id;
    const update: Record<string, unknown> = {
      $push: { answers: answerRecord },
      $set: { questionCount },
    };
    if (nextQuestionId) {
      update.$addToSet = { servedQuestionIds: nextQuestionId };
    }
    const saved = await PracticeRun.updateOne(
      {
        _id: run._id,
        userId: tokenPayload.userId,
        status: "IN_PROGRESS",
        "answers.questionId": { $ne: questionId },
        [`questions.${currentIndex}.id`]: questionId,
        $expr: { $eq: [{ $size: "$answers" }, currentIndex] },
      },
      update
    );
    if (saved.modifiedCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Câu trả lời đã được xử lý ở một yêu cầu khác",
        },
        { status: 409 }
      );
    }

    const context = {
      sessionId: run.sessionId.toString(),
      title: session.title,
      industry: session.industry || "",
      jobDescription: session.jobDescription || "",
      topic: session.topic || "",
      difficulty: run.difficulty || session.difficulty || "Middle",
      questionCount,
      language: run.language || session.language || "vi-VN",
      voiceId: run.voiceId || session.voiceId || "vi-VN-HoaiMyNeural",
    };
    const targetQuestionIndex = Math.min(
      nextQuestionIndex + 1,
      questionCount
    );
    after(() =>
      generateInterviewLookahead({
        runId,
        userId: tokenPayload.userId,
        aiRunId: run.aiRunId || runId,
        context,
        current: qaHistory[qaHistory.length - 1],
        qaHistory,
        targetQuestionIndex,
      })
    );

    const finalizedRun = await PracticeRun.findById(run._id)
      .select("questions")
      .lean();
    const nextQuestion =
      finalizedRun?.questions?.[nextQuestionIndex] || null;
    return NextResponse.json({
      success: true,
      completed: nextQuestionIndex >= questionCount,
      answeredCount: qaHistory.length,
      questionCount,
      nextQuestion,
      provider: "lookahead",
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/answer error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu câu trả lời quá lớn" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "Không thể lưu câu trả lời. Vui lòng thử lại.",
      },
      { status: 502 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
