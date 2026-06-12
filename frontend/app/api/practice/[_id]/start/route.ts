import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { verifyAccessToken } from "@/app/lib/Auth";
import User from "@/app/models/User";
import CreditLog from "@/app/models/CreditLog";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import { callAiBackend } from "@/app/lib/AiBackend";
import { calculatePracticeQuote } from "@/app/lib/PracticeBilling";

interface AiStartQuestion {
  id: string;
  text: string;
  competency?: string;
  difficulty?: string;
  expected_signals?: string[];
}

interface AiStartResponse {
  success: boolean;
  run_id: string;
  questions: AiStartQuestion[];
  provider: "deepseek" | "fallback";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  let createdRunId: string | null = null;
  let chargedCredits = 0;
  let userId = "";

  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy access token" },
        { status: 401 }
      );
    }

    const tokenPayload = verifyAccessToken(accessToken);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: "Access token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }
    userId = tokenPayload.userId;

    const body = await request.json();
    const {
      title,
      industry,
      jobDescription,
      topic,
      difficulty,
      duration,
      language,
      voiceId,
      hasUploadedJdFile,
      idempotencyKey,
    } = body;

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return NextResponse.json(
        { success: false, message: "Thiếu idempotency key" },
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

    const existingRun = await PracticeRun.findOne({
      userId,
      sessionId: _id,
      idempotencyKey,
    });
    if (existingRun) {
      if (existingRun.questions.length > 0 && existingRun.status !== "FAILED") {
        return NextResponse.json({
          success: true,
          runId: existingRun._id.toString(),
          questions: existingRun.questions,
          quote: {
            totalCredits: existingRun.creditUsage.chargedCredits,
            remainingCredits: undefined,
          },
        });
      }

      return NextResponse.json(
        { success: false, message: "Yêu cầu khởi tạo này đang được xử lý hoặc đã thất bại" },
        { status: 409 }
      );
    }

    const user = await User.findById(userId).select("credits").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const quote = calculatePracticeQuote({
      duration,
      hasUploadedJdFile: Boolean(hasUploadedJdFile),
      balanceCredits: user.credits || 0,
    });

    const practiceRun = await PracticeRun.create({
      userId,
      sessionId: _id,
      status: "STARTED",
      language: language || "vi-VN",
      voiceId: voiceId || "vi-VN-HoaiMyNeural",
      difficulty: difficulty || "Middle",
      questionCount: duration || 3,
      questions: [],
      answers: [],
      creditUsage: {
        quotedCredits: quote.totalCredits,
        chargedCredits: 0,
        refundedCredits: 0,
      },
      idempotencyKey,
    });
    createdRunId = practiceRun._id.toString();

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, credits: { $gte: quote.totalCredits } },
      { $inc: { credits: -quote.totalCredits } },
      { new: true }
    ).select("credits");

    if (!updatedUser) {
      practiceRun.status = "FAILED";
      await practiceRun.save();
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
    await practiceRun.save();

    await CreditLog.create({
      userId,
      credits: -chargedCredits,
      action: "AI_INTERVIEW",
      referenceId: createdRunId,
      description: `Trừ ${chargedCredits} Credits để khởi tạo buổi luyện tập "${title || session.title}"`,
      metadata: {
        practiceId: _id,
        duration,
        language,
        voiceId,
        hasUploadedJdFile: Boolean(hasUploadedJdFile),
      },
    });

    const aiStart = await callAiBackend<AiStartResponse>("/internal/interview/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: _id,
        title: title || session.title,
        industry: industry || session.industry || "",
        job_description: jobDescription || session.jobDescription || "",
        topic: topic || session.topic || "",
        difficulty: difficulty || "Middle",
        duration: duration || 3,
        language: language || "vi-VN",
        voice_id: voiceId || "vi-VN-HoaiMyNeural",
      }),
    });

    const questions = (aiStart.questions || []).map((question, index) => ({
      id: question.id || `q_${index + 1}`,
      text: question.text,
      competency: question.competency || "general",
      difficulty: question.difficulty || difficulty || "Middle",
    }));

    if (questions.length === 0) {
      throw new Error("AI backend returned no questions");
    }

    practiceRun.status = "IN_PROGRESS";
    practiceRun.questions = questions;
    await practiceRun.save();

    session.title = title?.trim() || session.title;
    session.industry = industry || session.industry;
    session.jobDescription = jobDescription ?? session.jobDescription;
    session.topic = topic ?? session.topic;
    session.language = language || "vi-VN";
    session.voiceId = voiceId || "vi-VN-HoaiMyNeural";
    session.difficulty = difficulty || "Middle";
    session.questionCount = duration || 3;
    await session.save();

    return NextResponse.json({
      success: true,
      runId: createdRunId,
      questions,
      quote: {
        totalCredits: chargedCredits,
        remainingCredits: updatedUser.credits,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/practice/[id]/start error:", error);

    if (createdRunId && userId && chargedCredits > 0) {
      try {
        await User.updateOne({ _id: userId }, { $inc: { credits: chargedCredits } });
        await PracticeRun.updateOne(
          { _id: createdRunId },
          {
            $set: {
              status: "REFUNDED",
              "creditUsage.refundedCredits": chargedCredits,
            },
          }
        );
        await CreditLog.create({
          userId,
          credits: chargedCredits,
          action: "AI_INTERVIEW_REFUND",
          referenceId: createdRunId,
          description: `Hoàn ${chargedCredits} Credits do không thể khởi tạo AI interview`,
        });
      } catch (refundError) {
        console.error("Refund after AI start failure failed:", refundError);
      }
    }

    return NextResponse.json(
      { success: false, message: "Không thể khởi tạo buổi luyện tập AI. Credits đã được hoàn nếu có phát sinh trừ tiền." },
      { status: 502 }
    );
  }
}
