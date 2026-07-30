import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import connectDB from "@/app/lib/ConnectDB";
import PracticeSession from "@/app/models/PracticeSession";
import { authenticateRequest } from "@/app/lib/Auth";
import type { IPracticeSession } from "@/app/types";
import { normalizeInterviewQuestionCount } from "@/app/lib/PracticeBilling";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

interface LeanPracticeSession {
  _id: Types.ObjectId;
  source?: "practice" | "recruitment";
  lockedConfig?: boolean;
  scheduledAt?: Date;
  expiresAt?: Date;
  title: string;
  jobDescription?: string;
  topic?: string;
  industry?: string;
  language?: string;
  voiceId?: string;
  difficulty?: string;
  questionCount?: number;
  tags?: string[];
  attemptCount?: number;
  highestScore?: number;
  latestResult?: IPracticeSession["latestResult"];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    await connectDB();

    const sessions = await PracticeSession.find({ userId: payload.userId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean<LeanPracticeSession[]>();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        source: session.source || "practice",
        lockedConfig: session.lockedConfig === true,
        scheduledAt: session.scheduledAt,
        expiresAt: session.expiresAt,
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
      })),
    });
  } catch (error: unknown) {
    console.error("GET /api/practice error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";
    const jobDescription =
      typeof body.jobDescription === "string"
        ? body.jobDescription.trim()
        : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";

    if (
      !title ||
      title.length > 200 ||
      industry.length > 120 ||
      jobDescription.length > 50_000 ||
      topic.length > 2_000
    ) {
      return NextResponse.json(
        { success: false, message: "Nội dung buổi phỏng vấn không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();

    // Derive searchable tags from the submitted practice context.
    const tags: string[] = [];
    if (industry) {
      tags.push(industry);
    }
    const keywords = `${topic || ""} ${jobDescription || ""}`.toLowerCase();
    const mentionsNode = /\bnode(?:\.?js)?\b/i.test(keywords);
    const mentionsStandaloneJs = /\bjs\b/i.test(keywords) && !mentionsNode;

    if (
      /\b(react|frontend|next(?:\.?js)?|html|css|javascript)\b/i.test(
        keywords
      ) ||
      mentionsStandaloneJs
    ) {
      tags.push("Frontend");
    }
    if (
      /\b(backend|node(?:\.?js)?|python|golang|java|api|database|sql|mongodb|grpc)\b/i.test(
        keywords
      )
    ) {
      tags.push("Backend");
    }
    if (/\b(system design|architecture)\b/i.test(keywords)) {
      tags.push("System Design");
    }
    if (/\b(marketing|seo|ads)\b/i.test(keywords)) {
      tags.push("Marketing");
    }
    if (/\b(sales|bán hàng)\b/i.test(keywords)) {
      tags.push("Sales");
    }
    if (tags.length === 0) {
      tags.push("General");
    }

    // Keep unique tags
    const uniqueTags = Array.from(new Set(tags));

    const newSession = await PracticeSession.create({
      userId: payload.userId,
      title,
      industry: industry || "Công nghệ thông tin",
      jobDescription,
      topic,
      language: "vi-VN",
      voiceId: "vi-VN-HoaiMyNeural",
      difficulty: "Middle",
      questionCount: 5,
      tags: uniqueTags,
      attemptCount: 0,
      highestScore: 0,
    });

    return NextResponse.json({
      success: true,
      message: "Tạo buổi luyện tập thành công",
      session: {
        id: newSession._id.toString(),
        title: newSession.title,
        jobDescription: newSession.jobDescription,
        topic: newSession.topic,
        industry: newSession.industry,
        language: newSession.language,
        voiceId: newSession.voiceId,
        difficulty: newSession.difficulty,
        questionCount: newSession.questionCount,
        tags: newSession.tags,
        attemptCount: newSession.attemptCount,
        highestScore: newSession.highestScore,
        createdAt: newSession.createdAt,
        updatedAt: newSession.updatedAt,
      },
    });
  } catch (error: unknown) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu buổi luyện tập quá lớn" },
        { status: 413 }
      );
    }
    console.error("POST /api/practice error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
