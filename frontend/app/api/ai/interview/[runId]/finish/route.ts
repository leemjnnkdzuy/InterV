import { withApiLogging } from "@/app/lib/ApiLogging";
import { after, NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  AiBackendError,
  aiBackend,
  type GrpcAudioAnalysisChunk,
  type GrpcAudioBehaviorAnalysis,
  type GrpcQaPair,
} from "@/app/lib/AiBackend";
import PracticeAudio from "@/app/models/PracticeAudio";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import {
  MIN_INTERVIEW_QUESTIONS,
  normalizeInterviewQuestionCount,
} from "@/app/lib/PracticeBilling";
import { recordDeepSeekUsageSafely } from "@/app/lib/DeepSeekUsage";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

interface FinishPayload {
  practiceId?: string;
  duration?: string;
}

export const maxDuration = 600;

function toAudioBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value !== "object" || value === null) {
    return Buffer.alloc(0);
  }

  const binary = value as {
    buffer?: unknown;
    position?: unknown;
    type?: unknown;
    data?: unknown;
  };
  if (
    binary.type === "Buffer" &&
    Array.isArray(binary.data) &&
    binary.data.every(
      (item) => Number.isInteger(item) && item >= 0 && item <= 255
    )
  ) {
    return Buffer.from(binary.data);
  }
  if (Buffer.isBuffer(binary.buffer)) {
    const length =
      typeof binary.position === "number" &&
      Number.isSafeInteger(binary.position) &&
      binary.position >= 0
        ? Math.min(binary.position, binary.buffer.length)
        : binary.buffer.length;
    return Buffer.from(binary.buffer.subarray(0, length));
  }
  if (binary.buffer instanceof Uint8Array) {
    const length =
      typeof binary.position === "number" &&
      Number.isSafeInteger(binary.position) &&
      binary.position >= 0
        ? Math.min(binary.position, binary.buffer.byteLength)
        : binary.buffer.byteLength;
    return Buffer.from(
      binary.buffer.buffer,
      binary.buffer.byteOffset,
      length
    );
  }
  return Buffer.alloc(0);
}

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  let claimedRunId = "";
  let claimStartedAt: Date | null = null;
  let usageUserId = "";
  let usageSessionId = "";
  let usageAiRunId = "";
  let usageEventKey = "";
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
        { success: false, message: "Bạn cần đăng nhập để hoàn tất phỏng vấn" },
        { status: 401 }
      );
    }
    usageUserId = tokenPayload.userId;

    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as FinishPayload;
    if (
      (body.practiceId &&
        !/^[0-9a-fA-F]{24}$/.test(body.practiceId)) ||
      (body.duration &&
        (typeof body.duration !== "string" || body.duration.length > 40))
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu hoàn tất không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();

    let run = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
    });
    if (!run) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lượt phỏng vấn" },
        { status: 404 }
      );
    }

    if (run.status === "COMPLETED" && run.evaluation) {
      return NextResponse.json({
        success: true,
        result: run.evaluation,
        alreadyCompleted: true,
      });
    }
    if (
      run.status === "EVALUATING" &&
      run.evaluationStartedAt &&
      run.evaluationStartedAt.getTime() > Date.now() - 10 * 60_000
    ) {
      return NextResponse.json(
        {
          success: false,
          evaluating: true,
          message: "Kết quả đang được tổng hợp",
        },
        { status: 409 }
      );
    }

    const session = await PracticeSession.findOne({
      _id: body.practiceId || run.sessionId,
      userId: tokenPayload.userId,
    });
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    const answersByQuestionId = new Map(
      run.answers.map((answer) => [answer.questionId, answer])
    );
    const questionCount = normalizeInterviewQuestionCount(run.questionCount);
    const requiredQuestions = run.questions.slice(0, questionCount);
    const qaHistory: GrpcQaPair[] = requiredQuestions.map((question) => {
      const answer = answersByQuestionId.get(question.id);
      return {
        questionId: question.id,
        question: question.text,
        answer: answer?.editedAnswer || answer?.transcript || "",
        groundingIds: question.groundingIds || [],
      };
    });
    const answeredCount = qaHistory.filter((item) => item.answer.trim()).length;
    if (
      requiredQuestions.length < MIN_INTERVIEW_QUESTIONS ||
      answeredCount < questionCount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Cần hoàn thành đủ ${questionCount} câu trước khi chấm điểm.`,
          answeredCount,
          questionCount,
        },
        { status: 409 }
      );
    }

    const audioDocuments = await PracticeAudio.find({
      runId: run._id,
      userId: tokenPayload.userId,
    })
      .select("+audioData +audioBase64")
      .lean();
    const transcriptByQuestionId = new Map(
      qaHistory.map((item) => [item.questionId, item.answer])
    );
    const aiRunId = run.aiRunId || runId;
    const audioChunks: GrpcAudioAnalysisChunk[] = audioDocuments.map(
      (audio, index) => {
        const audioBytes = audio.audioData
          ? toAudioBuffer(audio.audioData as unknown)
          : Buffer.from(audio.audioBase64 || "", "base64");
        return {
        runId: aiRunId,
        questionId: audio.questionId,
        transcript:
          transcriptByQuestionId.get(audio.questionId) ||
          audio.transcript ||
          "",
        audio: audioBytes,
        contentType: audio.mimeType,
        durationSec: audio.durationSec || 0,
        finalChunk: index === audioDocuments.length - 1,
        };
      }
    );

    const invalidAudio = audioChunks.find(
      (chunk, index) =>
        chunk.audio.length === 0 ||
        chunk.audio.length !== audioDocuments[index].sizeBytes
    );
    if (invalidAudio) {
      return NextResponse.json(
        {
          success: false,
          message: "Bản ghi âm đã lưu không hợp lệ hoặc bị thiếu dữ liệu.",
        },
        { status: 422 }
      );
    }
    if (audioChunks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không có bản ghi âm để phân tích cách trình bày. Hãy ghi âm ít nhất một câu trả lời.",
        },
        { status: 422 }
      );
    }

    claimStartedAt = new Date();
    const claimedRun = await PracticeRun.findOneAndUpdate(
      {
        _id: run._id,
        userId: tokenPayload.userId,
        $or: [
          { status: "IN_PROGRESS" },
          {
            status: "EVALUATING",
            evaluationStartedAt: {
              $lt: new Date(Date.now() - 10 * 60_000),
            },
          },
        ],
      },
      {
        $set: {
          status: "EVALUATING",
          evaluationStartedAt: claimStartedAt,
        },
      },
      { returnDocument: "after" }
    );
    if (!claimedRun) {
      return NextResponse.json(
        {
          success: false,
          evaluating: true,
          message: "Kết quả đang được tổng hợp",
        },
        { status: 409 }
      );
    }
    run = claimedRun;
    claimedRunId = run._id.toString();
    usageSessionId = run.sessionId.toString();

    const analysisResponse = await aiBackend.analyzeInterview(audioChunks);
    const audioAnalysis: GrpcAudioBehaviorAnalysis =
      analysisResponse.analysis;
    if (audioAnalysis.provider !== "sensevoice") {
      throw new Error("The mandatory delivery analysis did not complete");
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
      voiceId:
        run.voiceId ||
        session.voiceId ||
        "hn_female_ngochuyen_full_48k-fhg",
    };
    usageAiRunId = aiRunId;
    usageEventKey = `interview-evaluate:${claimedRunId}:${claimStartedAt.toISOString()}`;
    const aiResponse = await aiBackend.evaluateInterview({
      runId: aiRunId,
      context,
      qaHistory,
      audioAnalysis,
    });
    if (aiResponse.usage) {
      after(() =>
        recordDeepSeekUsageSafely({
          eventKey: usageEventKey,
          userId: usageUserId,
          sessionId: usageSessionId,
          practiceRunId: claimedRunId,
          aiRunId: usageAiRunId,
          operation: "interview_evaluate",
          status: "SUCCESS",
          usage: aiResponse.usage,
        })
      );
    }

    const evaluation = aiResponse.evaluation;
    const durationSec = Math.round(
      run.answers.reduce(
        (total, answer) => total + (answer.audioDurationSec || 0),
        0
      )
    );
    const result = {
      score: evaluation.score,
      duration: body.duration || "10 phút",
      durationSec,
      feedback: evaluation.feedback,
      ratings: evaluation.ratings,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      recommendations: evaluation.recommendations,
      audioAnalysis: evaluation.audioAnalysis || audioAnalysis,
      questions: evaluation.questions.map((question) => ({
        question: question.question,
        answer: question.answer,
        feedback: question.feedback,
        score: question.score,
        evidence: question.evidence,
        groundingIds: question.groundingIds,
      })),
      groundingIds: evaluation.groundingIds,
      provider: aiResponse.provider,
      createdAt: new Date(),
    };

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(
        async () => {
          const runUpdate = await PracticeRun.updateOne(
            {
              _id: run._id,
              userId: tokenPayload.userId,
              status: "EVALUATING",
              evaluationStartedAt: claimStartedAt,
            },
            {
              $set: {
                status: "COMPLETED",
                questionCount,
                evaluation: result,
              },
              $unset: { evaluationStartedAt: "" },
            },
            { session: dbSession }
          );
          if (runUpdate.modifiedCount !== 1) {
            throw new Error("Evaluation lease was lost");
          }
          await PracticeSession.updateOne(
            {
              _id: session._id,
              userId: tokenPayload.userId,
            },
            {
              $inc: { attemptCount: 1 },
              $set: {
                questionCount,
                latestResult: result,
              },
              $max: { highestScore: result.score },
            },
            { session: dbSession }
          );
          if (
            session.source === "recruitment" &&
            session.recruitmentInvitationId
          ) {
            const invitationUpdate = await RecruitmentInvitation.updateOne(
              {
                _id: session.recruitmentInvitationId,
                candidateId: tokenPayload.userId,
                practiceSessionId: session._id,
                status: "IN_PROGRESS",
              },
              {
                $set: {
                  status: "COMPLETED",
                  completedAt: new Date(),
                  lastRunId: run._id,
                  finalScore: result.score,
                },
              },
              { session: dbSession }
            );
            if (invitationUpdate.matchedCount !== 1) {
              throw new Error("Recruitment invitation completion was lost");
            }
          }
        },
        {
          readPreference: "primary",
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
          maxCommitTimeMS: 10_000,
        }
      );
    } finally {
      await dbSession.endSession();
    }

    return NextResponse.json({
      success: true,
      result,
      provider: aiResponse.provider,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/finish error:", error);
    if (
      error instanceof AiBackendError &&
      error.usage &&
      claimedRunId &&
      usageUserId &&
      usageSessionId &&
      usageEventKey
    ) {
      after(() =>
        recordDeepSeekUsageSafely({
          eventKey: usageEventKey,
          userId: usageUserId,
          sessionId: usageSessionId,
          practiceRunId: claimedRunId,
          aiRunId: usageAiRunId,
          operation: "interview_evaluate",
          status: "FAILED",
          usage: error.usage!,
          errorCode: String(error.status),
          errorMessage: error.message,
        })
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu hoàn tất quá lớn" },
        { status: 413 }
      );
    }
    if (claimedRunId && claimStartedAt) {
      await PracticeRun.updateOne(
        {
          _id: claimedRunId,
          status: "EVALUATING",
          evaluationStartedAt: claimStartedAt,
        },
        {
          $set: { status: "IN_PROGRESS" },
          $unset: { evaluationStartedAt: "" },
        }
      ).catch(() => undefined);
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof AiBackendError || error instanceof Error
            ? error.message
            : "Không thể tổng hợp đánh giá phỏng vấn",
      },
      { status: 502 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
