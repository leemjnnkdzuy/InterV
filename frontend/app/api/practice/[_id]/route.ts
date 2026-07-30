import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import PracticeSession from "@/app/models/PracticeSession";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeAudio from "@/app/models/PracticeAudio";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import { normalizeInterviewQuestionCount } from "@/app/lib/PracticeBilling";
import { authenticateRequest } from "@/app/lib/Auth";
import { aiBackend } from "@/app/lib/AiBackend";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

const SUPPORTED_LANGUAGES = new Set(["vi-VN", "en-US", "zh-CN"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    await connectDB();

    const session = await PracticeSession.findOne({
      _id,
      userId: payload.userId,
    }).lean();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }

    if (
      session.source === "recruitment" &&
      session.recruitmentInvitationId
    ) {
      await RecruitmentInvitation.updateOne(
        {
          _id: session.recruitmentInvitationId,
          candidateId: payload.userId,
          status: "INVITED",
        },
        {
          $set: {
            status: "VIEWED",
            viewedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session._id.toString(),
        source: session.source || "practice",
        lockedConfig: session.lockedConfig === true,
        scheduledAt: session.scheduledAt,
        expiresAt: session.expiresAt,
        maxAttempts: session.maxAttempts,
        title: session.title,
        jobDescription: session.jobDescription,
        topic: session.topic,
        industry: session.industry,
        language: session.language,
        voiceId: session.voiceId,
        difficulty: session.difficulty,
        questionCount: normalizeInterviewQuestionCount(session.questionCount),
        tags: session.tags || [],
        attemptCount: session.attemptCount || 0,
        highestScore: session.highestScore || 0,
        latestResult: session.latestResult,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/practice/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = (await readJsonBodyLimited(
      request,
      64 * 1024
    )) as Record<string, unknown>;
    const {
      title,
      jobDescription,
      topic,
      industry,
      language,
      voiceId,
      difficulty,
      questionCount,
    } = body;

    if (
      (title !== undefined &&
        (typeof title !== "string" || title.trim().length > 200)) ||
      (jobDescription !== undefined &&
        (typeof jobDescription !== "string" ||
          jobDescription.length > 50_000)) ||
      (topic !== undefined &&
        (typeof topic !== "string" || topic.length > 2_000)) ||
      (industry !== undefined &&
        (typeof industry !== "string" || industry.length > 120)) ||
      (language !== undefined &&
        (typeof language !== "string" ||
          !SUPPORTED_LANGUAGES.has(language))) ||
      (voiceId !== undefined &&
        (typeof voiceId !== "string" ||
          voiceId.length === 0 ||
          voiceId.length > 120)) ||
      (difficulty !== undefined &&
        (typeof difficulty !== "string" ||
          difficulty.length === 0 ||
          difficulty.length > 80)) ||
      (questionCount !== undefined &&
        (!Number.isInteger(Number(questionCount)) ||
          Number(questionCount) < 5 ||
          Number(questionCount) > 25))
    ) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu cập nhật không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    const session = await PracticeSession.findOne({
      _id,
      userId: payload.userId,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy buổi luyện tập" },
        { status: 404 }
      );
    }
    if (session.lockedConfig || session.source === "recruitment") {
      return NextResponse.json(
        {
          success: false,
          message: "Cấu hình phỏng vấn tuyển dụng do nhà tuyển dụng quản lý",
        },
        { status: 403 }
      );
    }
    session.questionCount = normalizeInterviewQuestionCount(
      session.questionCount
    );

    if (title !== undefined) {
      if (!(title as string).trim()) {
        return NextResponse.json(
          { success: false, message: "Tiêu đề không được để trống" },
          { status: 400 }
        );
      }
      session.title = (title as string).trim();
    }
    if (jobDescription !== undefined) {
      session.jobDescription = jobDescription as string;
    }
    if (topic !== undefined) {
      session.topic = topic as string;
    }
    if (industry !== undefined) {
      session.industry = industry as string;
    }
    if (language !== undefined) {
      session.language = language as string;
    }
    if (voiceId !== undefined) {
      session.voiceId = voiceId as string;
    }
    if (difficulty !== undefined) {
      session.difficulty = difficulty as string;
    }
    if (questionCount !== undefined) {
      session.questionCount = normalizeInterviewQuestionCount(questionCount);
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: "Cập nhật thành công",
      session: {
        id: session._id.toString(),
        title: session.title,
        jobDescription: session.jobDescription,
        topic: session.topic,
        industry: session.industry,
        language: session.language,
        voiceId: session.voiceId,
        difficulty: session.difficulty,
        questionCount: session.questionCount,
        tags: session.tags || [],
        attemptCount: session.attemptCount || 0,
        highestScore: session.highestScore || 0,
        latestResult: session.latestResult,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error: unknown) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu cập nhật quá lớn" },
        { status: 413 }
      );
    }
    console.error("PUT /api/practice/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ _id: string }> }
) {
  try {
    const { _id } = await params;
    if (!_id || !/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    await connectDB();

    const session = await PracticeSession.findOne({
      _id,
      userId: payload.userId,
    }).select("_id source");

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy hoặc không có quyền xóa buổi luyện tập này" },
        { status: 404 }
      );
    }

    if (session.source === "recruitment") {
      return NextResponse.json(
        {
          success: false,
          message: "Không thể xóa buổi phỏng vấn do nhà tuyển dụng giao",
        },
        { status: 403 }
      );
    }

    await aiBackend.deleteKnowledge({ sessionId: _id });
    await Promise.all([
      PracticeAudio.deleteMany({ sessionId: _id, userId: payload.userId }),
      PracticeRun.deleteMany({ sessionId: _id, userId: payload.userId }),
      PracticeSession.deleteOne({ _id, userId: payload.userId }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Xóa buổi luyện tập thành công",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/practice/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
