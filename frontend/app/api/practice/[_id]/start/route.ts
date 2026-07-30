import { after, NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import { authenticatePrincipal } from "@/app/lib/Auth";
import User from "@/app/models/User";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import {
  AiBackendError,
  aiBackend,
  type GrpcQuestion,
} from "@/app/lib/AiBackend";
import { recordDeepSeekUsageSafely } from "@/app/lib/DeepSeekUsage";
import {
  chargePracticeRun,
  refundPracticeRun,
} from "@/app/lib/PracticeCreditSettlement";
import {
  calculatePracticeQuote,
  normalizeInterviewQuestionCount,
} from "@/app/lib/PracticeBilling";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

export const maxDuration = 360;
const START_LEASE_MS = 370 * 1000;

function boundedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function createStartRequestHash(input: {
  title: string;
  industry: string;
  jobDescription: string;
  topic: string;
  difficulty: string;
  language: string;
  voiceId: string;
  questionCount: number;
  hasUploadedJdFile: boolean;
}) {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

function normalizeQuestion(
  question: GrpcQuestion,
  index: number,
  fallbackDifficulty: string
) {
  return {
    id: question.id || `q_${index + 1}`,
    text: question.text,
    competency: question.competency || "general",
    difficulty: question.difficulty || fallbackDifficulty,
    expectedSignals: question.expectedSignals || [],
    groundingIds: question.groundingIds || [],
  };
}

async function firstQuestionAudio(
  text: string,
  language: string,
  voiceId: string
) {
  const response = await aiBackend.synthesizeTts({
    text: text.slice(0, 500),
    language,
    voiceId,
  });
  return {
    audioBase64: response.audio.toString("base64"),
    contentType: response.contentType || "audio/mpeg",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  let createdRunId: string | null = null;
  let chargedCredits = 0;
  let userId = "";
  let startLeaseId = "";
  let aiRunIdForCleanup = "";
  let usageSessionId = "";
  let usageEventKey = "";

  try {
    const { _id } = await params;
    usageSessionId = _id || "";
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }
    const principal = await authenticatePrincipal(request);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }
    const tokenPayload = principal.payload;
    userId = tokenPayload.userId;

    const body = (await readJsonBodyLimited(
      request,
      64 * 1024
    )) as Record<string, unknown>;
    let title = boundedString(body.title, 200);
    let industry = boundedString(body.industry, 120);
    let jobDescription = boundedString(body.jobDescription, 50_000);
    let topic = boundedString(body.topic, 2_000);
    let difficulty = boundedString(body.difficulty, 80) || "Middle";
    let language = boundedString(body.language, 20) || "vi-VN";
    let voiceId =
      boundedString(body.voiceId, 120) || "vi-VN-HoaiMyNeural";
    let questionCount = normalizeInterviewQuestionCount(body.duration);
    const idempotencyKey = boundedString(body.idempotencyKey, 80);
    let hasUploadedJdFile = body.hasUploadedJdFile === true;
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey)) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu khởi tạo không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    const session = await PracticeSession.findOne({ _id, userId });
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }
    const isRecruitment = session.source === "recruitment";
    let recruitmentInvitationId: string | null = null;
    let recruitmentStartedAt: Date | undefined;
    if (isRecruitment) {
      if (principal.user.role !== "user") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Chỉ tài khoản ứng viên mới có thể bắt đầu phiên tuyển dụng",
          },
          { status: 403 }
        );
      }
      if (
        !session.recruitmentInvitationId ||
        !session.recruitmentCampaignId ||
        !session.recruiterId
      ) {
        return NextResponse.json(
          { success: false, message: "Liên kết lời mời tuyển dụng không hợp lệ" },
          { status: 409 }
        );
      }
      const [invitation, campaign] = await Promise.all([
        RecruitmentInvitation.findOne({
          _id: session.recruitmentInvitationId,
          campaignId: session.recruitmentCampaignId,
          practiceSessionId: session._id,
          candidateId: userId,
          recruiterId: session.recruiterId,
        }),
        RecruitmentCampaign.findOne({
          _id: session.recruitmentCampaignId,
          recruiterId: session.recruiterId,
          status: "ACTIVE",
        })
          .select("_id startsAt endsAt")
          .lean(),
      ]);
      if (!invitation || !campaign) {
        return NextResponse.json(
          {
            success: false,
            message: "Cuộc phỏng vấn đã đóng hoặc không còn hiệu lực",
          },
          { status: 409 }
        );
      }
      const now = Date.now();
      if (campaign.startsAt && campaign.startsAt.getTime() > now) {
        return NextResponse.json(
          {
            success: false,
            message: "Cuộc phỏng vấn chưa đến thời gian bắt đầu",
            startsAt: campaign.startsAt,
          },
          { status: 409 }
        );
      }
      if (
        campaign.endsAt.getTime() <= now ||
        invitation.expiresAt.getTime() <= now ||
        ["EXPIRED", "CANCELLED"].includes(invitation.status)
      ) {
        if (!["COMPLETED", "CANCELLED"].includes(invitation.status)) {
          invitation.status = "EXPIRED";
          await invitation.save();
        }
        return NextResponse.json(
          { success: false, message: "Lời mời phỏng vấn đã hết hạn" },
          { status: 410 }
        );
      }
      if (
        invitation.status === "COMPLETED" &&
        session.attemptCount >= (session.maxAttempts || 1)
      ) {
        return NextResponse.json(
          { success: false, message: "Bạn đã sử dụng hết số lượt phỏng vấn" },
          { status: 409 }
        );
      }
      recruitmentInvitationId = invitation._id.toString();
      recruitmentStartedAt = invitation.startedAt;
      title = session.title;
      industry = session.industry || "";
      jobDescription = session.jobDescription || "";
      topic = session.topic || "";
      difficulty = session.difficulty || "Middle";
      language = session.language || "vi-VN";
      voiceId = session.voiceId || "vi-VN-HoaiMyNeural";
      questionCount = normalizeInterviewQuestionCount(session.questionCount);
      hasUploadedJdFile = false;
    }
    if (!title || !/^[a-z]{2,3}-[A-Z]{2}$/.test(language)) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu khởi tạo không hợp lệ" },
        { status: 400 }
      );
    }
    const startRequestHash = createStartRequestHash({
      title,
      industry,
      jobDescription,
      topic,
      difficulty,
      language,
      voiceId,
      questionCount,
      hasUploadedJdFile,
    });

    const existingRun = await PracticeRun.findOne({
      userId,
      sessionId: _id,
      idempotencyKey,
    });
    let practiceRun = existingRun;
    if (practiceRun) {
      const existingQuestionCount = normalizeInterviewQuestionCount(
        practiceRun.questionCount
      );
      if (
        practiceRun.questions.length >= existingQuestionCount &&
        practiceRun.status === "IN_PROGRESS"
      ) {
        const first = practiceRun.questions[0];
        const audio = await firstQuestionAudio(
          first.text,
          practiceRun.language,
          practiceRun.voiceId
        );
        await PracticeRun.updateOne(
          { _id: practiceRun._id },
          {
            $set: { questionCount: existingQuestionCount },
            $addToSet: { servedQuestionIds: first.id },
          }
        );
        return NextResponse.json({
          success: true,
          runId: practiceRun._id.toString(),
          questions: practiceRun.questions,
          questionCount: existingQuestionCount,
          firstQuestionAudio: audio,
          quote: {
            totalCredits: practiceRun.creditUsage.chargedCredits,
          },
        });
      }
      if (practiceRun.status !== "STARTED") {
        return NextResponse.json(
          {
            success: false,
            message: "Yêu cầu khởi tạo này đã kết thúc hoặc được hoàn tiền",
          },
          { status: 409 }
        );
      }
    }

    const user = await User.findById(userId).select("credits").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }
    const quote = isRecruitment
      ? {
          totalCredits: 0,
          vndEquivalent: 0,
          balanceCredits: user.credits || 0,
          remainingCredits: user.credits || 0,
          canAfford: true,
          breakdown: [],
        }
      : calculatePracticeQuote({
          duration: questionCount,
          hasUploadedJdFile,
          balanceCredits: user.credits || 0,
        });

    startLeaseId = randomUUID();
    if (practiceRun) {
      const requestChanged =
        (practiceRun.startRequestHash &&
          practiceRun.startRequestHash !== startRequestHash) ||
        normalizeInterviewQuestionCount(practiceRun.questionCount) !==
          questionCount ||
        practiceRun.language !== language ||
        practiceRun.voiceId !== voiceId ||
        practiceRun.difficulty !== difficulty ||
        practiceRun.creditUsage.quotedCredits !== quote.totalCredits;
      if (requestChanged) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Idempotency key đã được dùng cho một cấu hình phỏng vấn khác",
          },
          { status: 409 }
        );
      }

      const now = new Date();
      const claimedRun = await PracticeRun.findOneAndUpdate(
        {
          _id: practiceRun._id,
          userId,
          status: "STARTED",
          $or: [
            { startLeaseExpiresAt: { $lte: now } },
            { startLeaseExpiresAt: { $exists: false } },
            { startLeaseExpiresAt: null },
          ],
        },
        {
          $set: {
            startLeaseId,
            startLeaseExpiresAt: new Date(Date.now() + START_LEASE_MS),
            startRequestHash,
          },
        },
        { returnDocument: "after" }
      );
      if (!claimedRun) {
        return NextResponse.json(
          {
            success: false,
            preparing: true,
            retryAfterSeconds: 3,
            message: "Buổi phỏng vấn đang được chuẩn bị",
          },
          {
            status: 409,
            headers: { "Retry-After": "3" },
          }
        );
      }
      practiceRun = claimedRun;
    } else {
      try {
        practiceRun = await PracticeRun.create({
          userId,
          sessionId: _id,
          status: "STARTED",
          startLeaseId,
          startLeaseExpiresAt: new Date(Date.now() + START_LEASE_MS),
          startRequestHash,
          language,
          voiceId,
          difficulty,
          questionCount,
          questions: [],
          answers: [],
          servedQuestionIds: [],
          creditUsage: {
            quotedCredits: quote.totalCredits,
            chargedCredits: 0,
            refundedCredits: 0,
          },
          idempotencyKey,
        });
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === 11000
        ) {
          return NextResponse.json(
            {
              success: false,
              preparing: true,
              retryAfterSeconds: 3,
              message: "Buổi phỏng vấn đang được chuẩn bị",
            },
            {
              status: 409,
              headers: { "Retry-After": "3" },
            }
          );
        }
        throw error;
      }
    }
    createdRunId = practiceRun._id.toString();
    usageEventKey = `interview-start:${createdRunId}:${startLeaseId}`;

    const charge =
      quote.totalCredits === 0
        ? {
            outcome: "settled" as const,
            remainingCredits: user.credits || 0,
          }
        : await chargePracticeRun({
            runId: createdRunId,
            userId,
            credits: quote.totalCredits,
            description: `Trừ ${quote.totalCredits} Credits để khởi tạo buổi luyện tập "${title}"`,
            metadata: {
              practiceId: _id,
              duration: questionCount,
              language,
              voiceId,
              hasUploadedJdFile,
            },
          });
    if (charge.outcome === "insufficient") {
      return NextResponse.json(
        {
          success: false,
          message: `Không đủ credits. Bạn cần ${quote.totalCredits} credits để bắt đầu.`,
          quote,
        },
        { status: 402 }
      );
    }

    chargedCredits = quote.totalCredits;
    practiceRun.creditUsage.chargedCredits = chargedCredits;

    const aiStart = await aiBackend.startInterview({
      sessionId: _id,
      title,
      industry: industry || session.industry || "",
      jobDescription,
      topic,
      difficulty,
      questionCount,
      language,
      voiceId,
    });
    if (aiStart.usage) {
      after(() =>
        recordDeepSeekUsageSafely({
          eventKey: usageEventKey,
          userId,
          sessionId: usageSessionId,
          practiceRunId: createdRunId!,
          aiRunId: aiStart.runId,
          operation: "interview_start",
          status: "SUCCESS",
          usage: aiStart.usage,
        })
      );
    }
    aiRunIdForCleanup = aiStart.runId;
    const aiRunPersisted = await PracticeRun.updateOne(
      {
        _id: practiceRun._id,
        userId,
        status: "STARTED",
        startLeaseId,
      },
      { $set: { aiRunId: aiStart.runId } }
    );
    if (aiRunPersisted.matchedCount !== 1) {
      throw new Error("Interview start lease was lost");
    }
    const questions = (aiStart.questions || []).map((question, index) =>
      normalizeQuestion(question, index, difficulty)
    );
    if (
      questions.length !== questionCount ||
      questions.some((question) => !question.text.trim())
    ) {
      throw new Error(
        `AI backend returned ${questions.length}/${questionCount} questions`
      );
    }
    const audio = await firstQuestionAudio(
      questions[0].text,
      language,
      voiceId
    );

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(
        async () => {
          const runUpdate = await PracticeRun.updateOne(
            {
              _id: practiceRun._id,
              userId,
              status: "STARTED",
              startLeaseId,
            },
            {
              $set: {
                aiRunId: aiStart.runId,
                status: "IN_PROGRESS",
                questionCount,
                questions,
                servedQuestionIds: [questions[0].id],
              },
              $unset: {
                startLeaseId: "",
                startLeaseExpiresAt: "",
              },
            },
            { session: dbSession }
          );
          if (runUpdate.modifiedCount !== 1) {
            throw new Error("Interview start lease was lost");
          }
          const sessionUpdate = await PracticeSession.updateOne(
            { _id: session._id, userId },
            {
              $set: {
                title,
                industry: industry || session.industry,
                jobDescription,
                topic,
                language,
                voiceId,
                difficulty,
                questionCount,
              },
            },
            { session: dbSession }
          );
          if (sessionUpdate.matchedCount !== 1) {
            throw new Error("Practice session disappeared during start");
          }
          if (isRecruitment && recruitmentInvitationId) {
            const activeCampaign = await RecruitmentCampaign.exists({
              _id: session.recruitmentCampaignId,
              recruiterId: session.recruiterId,
              status: "ACTIVE",
              endsAt: { $gt: new Date() },
            }).session(dbSession);
            if (!activeCampaign) {
              throw new Error("Recruitment campaign closed during start");
            }
            const invitationUpdate = await RecruitmentInvitation.updateOne(
              {
                _id: recruitmentInvitationId,
                candidateId: userId,
                practiceSessionId: session._id,
                status: {
                  $in: ["INVITED", "VIEWED", "IN_PROGRESS", "COMPLETED"],
                },
                expiresAt: { $gt: new Date() },
              },
              {
                $set: {
                  status: "IN_PROGRESS",
                  startedAt: recruitmentStartedAt || new Date(),
                  lastRunId: practiceRun._id,
                },
                $unset: {
                  completedAt: "",
                  finalScore: "",
                },
              },
              { session: dbSession }
            );
            if (invitationUpdate.matchedCount !== 1) {
              throw new Error("Recruitment invitation state changed");
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
      runId: createdRunId,
      questions,
      questionCount,
      firstQuestionAudio: audio,
      quote: {
        totalCredits: chargedCredits,
        remainingCredits: charge.remainingCredits,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/practice/[id]/start error:", error);
    if (
      error instanceof AiBackendError &&
      error.usage &&
      createdRunId &&
      userId &&
      usageSessionId &&
      usageEventKey
    ) {
      const failedRunId = createdRunId;
      const failedUsage = error.usage;
      after(() =>
        recordDeepSeekUsageSafely({
          eventKey: usageEventKey,
          userId,
          sessionId: usageSessionId,
          practiceRunId: failedRunId,
          operation: "interview_start",
          status: "FAILED",
          usage: failedUsage,
          errorCode: String(error.status),
          errorMessage: error.message,
        })
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu khởi tạo quá lớn" },
        { status: 413 }
      );
    }
    if (createdRunId && userId && chargedCredits > 0) {
      try {
        const refund = await refundPracticeRun(
          createdRunId,
          userId,
          `Hoàn ${chargedCredits} Credits do không thể khởi tạo AI interview`,
          startLeaseId
        );
        if (refund.outcome === "settled" && aiRunIdForCleanup) {
          await aiBackend
            .deleteKnowledge({ runId: aiRunIdForCleanup })
            .catch((cleanupError) => {
              console.error(
                "AI knowledge cleanup after start failure failed:",
                cleanupError instanceof Error
                  ? cleanupError.message
                  : "Unknown cleanup error"
              );
            });
        }
      } catch (refundError) {
        console.error("Refund after AI start failure failed:", refundError);
      }
    } else if (createdRunId) {
      await PracticeRun.updateOne(
        {
          _id: createdRunId,
          status: "STARTED",
          startLeaseId,
        },
        {
          $set: { status: "FAILED" },
          $unset: {
            startLeaseId: "",
            startLeaseExpiresAt: "",
          },
        }
      ).catch(() => undefined);
      if (aiRunIdForCleanup) {
        await aiBackend
          .deleteKnowledge({ runId: aiRunIdForCleanup })
          .catch((cleanupError) => {
            console.error(
              "AI knowledge cleanup after free start failure failed:",
              cleanupError instanceof Error
                ? cleanupError.message
                : "Unknown cleanup error"
            );
          });
      }
    }
    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể khởi tạo buổi luyện tập AI. Credits đã được hoàn nếu có phát sinh trừ tiền.",
      },
      { status: 502 }
    );
  }
}
