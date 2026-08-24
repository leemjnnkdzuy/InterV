import { withApiLogging } from "@/app/lib/ApiLogging";
import { after, NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import { aiBackend, type GrpcQuestion } from "@/app/lib/AiBackend";
import { recordDeepSeekUsageSafely } from "@/app/lib/DeepSeekUsage";
import { normalizeInterviewQuestionCount } from "@/app/lib/PracticeBilling";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import User from "@/app/models/User";
import { formatCandidateOnboardingProfile } from "@/app/lib/CandidateProfileHelper";
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

function normalizeOpeningQuestion(
  question: GrpcQuestion,
  turn: {
    acknowledgementText: string;
    transitionText: string;
    spokenText: string;
    transitionType: string;
  }
) {
  return {
    id: question.id || "q_1",
    text: question.text,
    ttsText: question.ttsText || question.text,
    acknowledgementText: turn.acknowledgementText,
    transitionText: turn.transitionText,
    spokenText: turn.spokenText,
    transitionType: turn.transitionType,
    competency: question.competency || "general",
    difficulty: question.difficulty || "Middle",
    expectedSignals: question.expectedSignals || [],
    groundingIds: question.groundingIds || [],
  };
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
    if (run.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, message: "Lượt phỏng vấn không còn nhận phần giới thiệu" },
        { status: 409 }
      );
    }

    const savedTranscript = run.candidateIntro?.transcript?.trim() || transcript;
    const savedPrompt = run.candidateIntro?.prompt?.trim() || prompt;
    if (!run.candidateIntro?.transcript?.trim()) {
      await PracticeRun.updateOne(
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
              prompt: savedPrompt,
              transcript: savedTranscript,
              audioDurationSec: durationSec,
              assemblySessionId,
              transcriptionProvider,
              createdAt: new Date(),
            },
          },
        }
      );
    }

    const detailedRun = await PracticeRun.findOne({
      _id: runId,
      userId: tokenPayload.userId,
      status: "IN_PROGRESS",
    }).select("aiRunId sessionId language voiceId difficulty questionCount questions");
    if (!detailedRun) {
      return NextResponse.json(
        { success: false, message: "Không thể đọc trạng thái lượt phỏng vấn" },
        { status: 409 }
      );
    }

    const existingFirstQuestion = detailedRun.questions[0];
    if (
      existingFirstQuestion?.spokenText &&
      existingFirstQuestion.transitionType === "opening_to_first"
    ) {
      const existingQuestionAudio = await aiBackend.synthesizeTts({
        text:
          existingFirstQuestion.spokenText ||
          existingFirstQuestion.ttsText ||
          existingFirstQuestion.text,
        language: detailedRun.language || "vi-VN",
        voiceId:
          detailedRun.voiceId || "hn_female_ngochuyen_full_48k-fhg",
      });
      if (!existingQuestionAudio.audio?.length) {
        throw new Error("AI backend did not return first question audio");
      }
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        nextQuestion: existingFirstQuestion,
        nextQuestionAudio: {
          audioBase64: existingQuestionAudio.audio.toString("base64"),
          contentType: existingQuestionAudio.contentType || "audio/mpeg",
        },
        acknowledgementText: existingFirstQuestion.acknowledgementText,
        transitionText: existingFirstQuestion.transitionText,
        spokenText: existingFirstQuestion.spokenText,
        transitionType: existingFirstQuestion.transitionType,
      });
    }

    const [session, user] = await Promise.all([
      PracticeSession.findOne({
        _id: detailedRun.sessionId,
        userId: tokenPayload.userId,
      }).select("title industry jobDescription topic difficulty language voiceId"),
      User.findById(tokenPayload.userId)
        .select("fullName headline targetRole targetIndustry skills education workExperience")
        .lean(),
    ]);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    const candidateProfile = formatCandidateOnboardingProfile(user);

    const context = {
      sessionId: detailedRun.sessionId.toString(),
      title: session.title,
      industry: session.industry || "",
      jobDescription: session.jobDescription || "",
      topic: session.topic || "",
      difficulty: detailedRun.difficulty || session.difficulty || "Middle",
      questionCount: normalizeInterviewQuestionCount(detailedRun.questionCount),
      language: detailedRun.language || session.language || "vi-VN",
      voiceId:
        detailedRun.voiceId ||
        session.voiceId ||
        "hn_female_ngochuyen_full_48k-fhg",
      candidateProfile,
    };
    const turn = await aiBackend.generateOpeningTurn({
      runId: detailedRun.aiRunId || runId,
      context,
      openingPrompt: savedPrompt,
      openingTranscript: savedTranscript,
      candidateProfile,
    });
    if (turn.usage) {
      after(() =>
        recordDeepSeekUsageSafely({
          eventKey: `interview-opening-turn:${runId}`,
          userId: tokenPayload.userId,
          sessionId: detailedRun.sessionId.toString(),
          practiceRunId: runId,
          aiRunId: detailedRun.aiRunId || runId,
          operation: "interview_opening_turn",
          status: "SUCCESS",
          usage: turn.usage,
        })
      );
    }
    if (!turn.hasNextQuestion || !turn.nextQuestion?.text) {
      return NextResponse.json(
        { success: false, message: "AI chưa tạo được câu hỏi đầu tiên" },
        { status: 502 }
      );
    }

    const nextQuestion = normalizeOpeningQuestion(turn.nextQuestion, turn);
    await PracticeRun.updateOne(
      {
        _id: runId,
        userId: tokenPayload.userId,
        status: "IN_PROGRESS",
        "questions.0.id": { $exists: true },
      },
      { $set: { "questions.0": nextQuestion } }
    );
    const nextQuestionAudio = await aiBackend.synthesizeTts({
      text: nextQuestion.spokenText || nextQuestion.ttsText || nextQuestion.text,
      language: context.language,
      voiceId: context.voiceId,
    });
    if (!nextQuestionAudio.audio?.length) {
      throw new Error("AI backend did not return first question audio");
    }

    return NextResponse.json({
      success: true,
      nextQuestion,
      nextQuestionAudio: {
        audioBase64: nextQuestionAudio.audio.toString("base64"),
        contentType: nextQuestionAudio.contentType || "audio/mpeg",
      },
      acknowledgementText: nextQuestion.acknowledgementText,
      transitionText: nextQuestion.transitionText,
      spokenText: nextQuestion.spokenText,
      transitionType: nextQuestion.transitionType,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/opening error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu phần giới thiệu quá lớn" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lưu phần giới thiệu",
      },
      { status: 502 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
