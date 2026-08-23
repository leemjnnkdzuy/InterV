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
  type GrpcDeepSeekUsage,
  type GrpcQaPair,
} from "@/app/lib/AiBackend";
import PracticeAudio from "@/app/models/PracticeAudio";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import {
  normalizeInterviewQuestionCount,
} from "@/app/lib/PracticeBilling";
import { recordDeepSeekUsageSafely } from "@/app/lib/DeepSeekUsage";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import type { CandidateIntroItem } from "@/app/types/PracticeRun";

interface FinishPayload {
  practiceId?: string;
  duration?: string;
  earlyFinish?: boolean;
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
  let profileUsageEventKey = "";
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

    const isEarlyFinish = body.earlyFinish === true;
    const answersByQuestionId = new Map(
      run.answers.map((answer) => [answer.questionId, answer])
    );
    const configuredQuestionCount = normalizeInterviewQuestionCount(
      run.questionCount
    );

    // Extract all questions that have submitted answers (transcript or edited answer)
    const answeredQuestions = run.questions.filter((q) => {
      const ans = answersByQuestionId.get(q.id);
      return Boolean(ans?.editedAnswer?.trim() || ans?.transcript?.trim());
    });

    const candidateQuestions =
      isEarlyFinish && answeredQuestions.length > 0
        ? answeredQuestions
        : answeredQuestions.length > 0 &&
            answeredQuestions.length < configuredQuestionCount
          ? answeredQuestions
          : run.questions.slice(0, configuredQuestionCount);

    const qaHistory: GrpcQaPair[] = candidateQuestions.map((question) => {
      const answer = answersByQuestionId.get(question.id);
      return {
        questionId: question.id,
        question: question.text,
        answer: answer?.editedAnswer || answer?.transcript || "",
        groundingIds: question.groundingIds || [],
      };
    });
    const answeredCount = qaHistory.filter((item) => item.answer.trim()).length;

    if (answeredCount === 0) {
      await PracticeRun.updateOne(
        { _id: run._id, userId: tokenPayload.userId },
        { $set: { status: "CANCELLED" } }
      );
      return NextResponse.json({
        success: true,
        cancelled: true,
        message: "Buổi phỏng vấn đã được kết thúc sớm.",
      });
    }

    const evaluationQuestionCount = Math.max(1, candidateQuestions.length);

    // Opening context is intentionally excluded from both scoring and delivery
    // analysis. Only audio attached to the configured knowledge questions is
    // eligible for the evaluation pipeline.
    const audioDocuments = await PracticeAudio.find({
      runId: run._id,
      userId: tokenPayload.userId,
      questionId: { $in: candidateQuestions.map((question) => question.id) },
    })
      .select("+audioData +audioBase64")
      .lean();
    const transcriptByQuestionId = new Map(
      qaHistory.map((item) => [item.questionId, item.answer])
    );
    const aiRunId = run.aiRunId || runId;
    const audioChunks: GrpcAudioAnalysisChunk[] = audioDocuments
      .filter((audio) => {
        const audioBytes = audio.audioData
          ? toAudioBuffer(audio.audioData as unknown)
          : Buffer.from(audio.audioBase64 || "", "base64");
        return audioBytes.length > 0;
      })
      .map((audio, index, arr) => {
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
          finalChunk: index === arr.length - 1,
        };
      });

    claimStartedAt = new Date();
    const claimedRun = await PracticeRun.findOneAndUpdate(
      {
        _id: run._id,
        userId: tokenPayload.userId,
        $or: [
          { status: "IN_PROGRESS" },
          { status: "STARTED" },
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
      const existingCompleted = await PracticeRun.findOne({
        _id: run._id,
        userId: tokenPayload.userId,
      });
      if (
        existingCompleted?.status === "COMPLETED" &&
        existingCompleted.evaluation
      ) {
        return NextResponse.json({
          success: true,
          result: existingCompleted.evaluation,
          alreadyCompleted: true,
        });
      }
      return NextResponse.json(
        {
          success: false,
          evaluating: true,
          message: "Kết quả đang được tổng hợp",
        },
        { status: 409 }
      );
    }
    const activeRun = claimedRun;
    claimedRunId = activeRun._id.toString();
    usageSessionId = activeRun.sessionId.toString();

    const context = {
      sessionId: activeRun.sessionId.toString(),
      title: session.title,
      industry: session.industry || "",
      jobDescription: session.jobDescription || "",
      topic: session.topic || "",
      difficulty: activeRun.difficulty || session.difficulty || "Middle",
      questionCount: evaluationQuestionCount,
      language: activeRun.language || session.language || "vi-VN",
      voiceId:
        activeRun.voiceId ||
        session.voiceId ||
        "hn_female_ngochuyen_full_48k-fhg",
    };

    type ProfileExtractionOutcome = {
      attempted: boolean;
      items?: CandidateIntroItem[];
      usage?: GrpcDeepSeekUsage;
      error?: unknown;
    };
    const isRecruitmentInterview = session.source === "recruitment";
    const existingProfileItems = activeRun.candidateIntro?.items;
    const hasCandidateIntro = Boolean(activeRun.candidateIntro?.transcript?.trim());
    const profileExtractionPromise: Promise<ProfileExtractionOutcome> =
      !isRecruitmentInterview || !hasCandidateIntro
        ? Promise.resolve({ attempted: false })
        : existingProfileItems && existingProfileItems.length > 0
          ? Promise.resolve({
              attempted: false,
              items: existingProfileItems as CandidateIntroItem[],
            })
          : (() => {
              profileUsageEventKey = `interview-profile-extract:${activeRun._id.toString()}:${claimStartedAt.toISOString()}`;
              return aiBackend
                .extractCandidateProfile({
                  transcript: activeRun.candidateIntro!.transcript,
                  title: session.title,
                  jobDescription: session.jobDescription || "",
                  language: activeRun.language || session.language || "vi-VN",
                })
                .then((response) => ({
                  attempted: true,
                  items: response.items as CandidateIntroItem[],
                  usage: response.usage,
                }))
                .catch((error: unknown) => ({
                  attempted: true,
                  error,
                }));
            })();

    let audioAnalysis: GrpcAudioBehaviorAnalysis | undefined = undefined;
    if (audioChunks.length > 0) {
      try {
        const analysisResponse = await aiBackend.analyzeInterview(audioChunks);
        if (analysisResponse?.analysis?.provider === "sensevoice") {
          audioAnalysis = analysisResponse.analysis;
        }
      } catch (audioErr) {
        console.warn("Sensevoice audio delivery analysis warning:", audioErr);
      }
    }

    usageAiRunId = aiRunId;
    usageEventKey = `interview-evaluate:${claimedRunId}:${claimStartedAt.toISOString()}`;
    const [aiResponse, profileOutcome] = await Promise.all([
      aiBackend.evaluateInterview({
        runId: aiRunId,
        context,
        qaHistory,
        audioAnalysis,
      }),
      profileExtractionPromise,
    ]);
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

    if (profileOutcome.attempted) {
      const profileError = profileOutcome.error;
      if (profileOutcome.usage) {
        after(() =>
          recordDeepSeekUsageSafely({
            eventKey: profileUsageEventKey,
            userId: usageUserId,
            sessionId: usageSessionId,
            practiceRunId: claimedRunId,
            aiRunId: usageAiRunId,
            operation: "interview_profile_extract",
            status: "SUCCESS",
            usage: profileOutcome.usage!,
          })
        );
      } else if (profileError instanceof AiBackendError && profileError.usage) {
        const profileUsage = profileError.usage as GrpcDeepSeekUsage;
        const profileErrorCode = String(profileError.status);
        const profileErrorMessage = profileError.message;
        after(() =>
          recordDeepSeekUsageSafely({
            eventKey: profileUsageEventKey,
            userId: usageUserId,
            sessionId: usageSessionId,
            practiceRunId: claimedRunId,
            aiRunId: usageAiRunId,
            operation: "interview_profile_extract",
            status: "FAILED",
            usage: profileUsage,
            errorCode: profileErrorCode,
            errorMessage: profileErrorMessage,
          })
        );
      }
      if (profileError) {
        console.warn(
          "Recruiter candidate profile extraction failed; using transcript fallback:",
          profileError instanceof Error ? profileError.message : profileError
        );
      }
    }

    const evaluation = aiResponse.evaluation;
    const candidateIntroItems = isRecruitmentInterview && hasCandidateIntro
      ? profileOutcome.items && profileOutcome.items.length > 0
        ? profileOutcome.items
        : [
            {
              category: "other",
              label: "Nội dung giới thiệu",
              value: activeRun.candidateIntro!.transcript.trim(),
              evidence: [activeRun.candidateIntro!.transcript.trim().slice(0, 500)],
            },
          ]
      : undefined;
    const durationSec = Math.round(
      activeRun.answers.reduce(
        (total, answer) => total + (answer.audioDurationSec || 0),
        0
      )
    );
    const result = {
      score: evaluation.score,
      duration: body.duration || "10 phút",
      durationSec,
      feedback: evaluation.feedback,
      candidateIntro: activeRun.candidateIntro
        ? {
            prompt: activeRun.candidateIntro.prompt,
            transcript: activeRun.candidateIntro.transcript,
            audioDurationSec: activeRun.candidateIntro.audioDurationSec,
            transcriptionProvider: activeRun.candidateIntro.transcriptionProvider,
          }
        : undefined,
      candidateIntroItems,
      ratings: evaluation.ratings,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      mistakes: evaluation.mistakes || [],
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
              _id: activeRun._id,
              userId: tokenPayload.userId,
              status: "EVALUATING",
              evaluationStartedAt: claimStartedAt,
            },
            {
              $set: {
                status: "COMPLETED",
                questionCount: evaluationQuestionCount,
                evaluation: result,
                ...(candidateIntroItems
                  ? { "candidateIntro.items": candidateIntroItems }
                  : {}),
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
                questionCount: evaluationQuestionCount,
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
                  lastRunId: activeRun._id,
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
      const aiError = error;
      const errorCode = String(aiError.status);
      const errorMessage = aiError.message;
      const errorUsage = aiError.usage as GrpcDeepSeekUsage;
      after(() =>
        recordDeepSeekUsageSafely({
          eventKey: usageEventKey,
          userId: usageUserId,
          sessionId: usageSessionId,
          practiceRunId: claimedRunId,
          aiRunId: usageAiRunId,
          operation: "interview_evaluate",
          status: "FAILED",
          usage: errorUsage,
          errorCode,
          errorMessage,
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
