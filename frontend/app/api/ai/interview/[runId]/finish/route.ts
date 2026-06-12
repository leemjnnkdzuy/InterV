import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import { verifyAccessToken } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import { callAiBackend } from "@/app/lib/AiBackend";

interface FinishPayload {
  practiceId: string;
  title: string;
  industry: string;
  difficulty: string;
  language: string;
  jobDescription: string;
  topic: string;
  questionsList: string[];
  qaHistory: Array<{ question: string; answer: string }>;
  duration: string;
}

interface AiEvaluationQuestion {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  evidence?: string[];
}

interface AiEvaluation {
  score: number;
  ratings: {
    communication: number;
    knowledge: number;
    problemSolving: number;
    confidence: number;
    jdFit?: number;
  };
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questions: AiEvaluationQuestion[];
}

interface AiEvaluateResponse {
  success: boolean;
  evaluation: AiEvaluation;
  provider: "deepseek" | "fallback";
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

    const body = (await request.json()) as FinishPayload;
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

    const answersByQuestion = new Map(
      body.qaHistory.map((qa) => [qa.question, qa.answer])
    );
    const fullQaHistory = body.questionsList.map((question) => ({
      question,
      answer: answersByQuestion.get(question) || "",
    }));

    const aiResponse = await callAiBackend<AiEvaluateResponse>(
      "/internal/interview/evaluate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run_id: runId,
          title: body.title || session.title,
          industry: body.industry || session.industry || "",
          job_description: body.jobDescription || session.jobDescription || "",
          topic: body.topic || session.topic || "",
          difficulty: body.difficulty || session.difficulty || "Middle",
          language: body.language || session.language || "vi-VN",
          qa_history: fullQaHistory,
        }),
      }
    );

    const result = {
      score: aiResponse.evaluation.score,
      duration: body.duration || "10 phút",
      feedback: aiResponse.evaluation.feedback,
      ratings: {
        communication: aiResponse.evaluation.ratings.communication,
        knowledge: aiResponse.evaluation.ratings.knowledge,
        problemSolving: aiResponse.evaluation.ratings.problemSolving,
        confidence: aiResponse.evaluation.ratings.confidence,
        jdFit: aiResponse.evaluation.ratings.jdFit,
      },
      questions: aiResponse.evaluation.questions.map((question) => ({
        question: question.question,
        answer: question.answer,
        feedback: question.feedback,
        score: question.score,
      })),
      createdAt: new Date(),
    };

    run.status = "COMPLETED";
    run.answers = fullQaHistory.map((qa, index) => ({
      questionId: run.questions[index]?.id || `q_${index + 1}`,
      question: qa.question,
      transcript: qa.answer,
      editedAnswer: qa.answer,
    }));
    run.evaluation = aiResponse.evaluation;
    await run.save();

    session.attemptCount = (session.attemptCount || 0) + 1;
    if (result.score > (session.highestScore || 0)) {
      session.highestScore = result.score;
    }
    session.latestResult = result;
    await session.save();

    return NextResponse.json({
      success: true,
      result,
      provider: aiResponse.provider,
    });
  } catch (error: unknown) {
    console.error("POST /api/ai/interview/[runId]/finish error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tổng hợp đánh giá phỏng vấn" },
      { status: 502 }
    );
  }
}
