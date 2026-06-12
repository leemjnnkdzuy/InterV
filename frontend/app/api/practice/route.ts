import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import connectDB from "@/app/lib/ConnectDB";
import PracticeSession from "@/app/models/PracticeSession";
import { verifyAccessToken } from "@/app/lib/Auth";
import type { IPracticeSession } from "@/app/types";

interface LeanPracticeSession {
  _id: Types.ObjectId;
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
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    await connectDB();

    const sessions = await PracticeSession.find({ userId: payload.userId })
      .sort({ updatedAt: -1 })
      .lean<LeanPracticeSession[]>();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => ({
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
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, industry, jobDescription, topic } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Tiêu đề buổi phỏng vấn không được để trống" },
        { status: 400 }
      );
    }

    await connectDB();

    // AI summary simulation - parse tags and content based on inputs
    const tags: string[] = [];
    if (industry) {
      tags.push(industry);
    }
    // Add extra tags based on job description / topic keywords
    const keywords = (topic + " " + jobDescription).toLowerCase();
    if (keywords.includes("react") || keywords.includes("frontend") || keywords.includes("nextjs") || keywords.includes("html") || keywords.includes("css") || keywords.includes("js") || keywords.includes("javascript") || keywords.includes("web")) {
      tags.push("Frontend");
    }
    if (keywords.includes("backend") || keywords.includes("node") || keywords.includes("python") || keywords.includes("golang") || keywords.includes("java") || keywords.includes("api") || keywords.includes("database") || keywords.includes("sql")) {
      tags.push("Backend");
    }
    if (keywords.includes("system design") || keywords.includes("architecture")) {
      tags.push("System Design");
    }
    if (keywords.includes("marketing") || keywords.includes("seo") || keywords.includes("ads")) {
      tags.push("Marketing");
    }
    if (keywords.includes("sales") || keywords.includes("bán hàng")) {
      tags.push("Sales");
    }
    if (tags.length === 0) {
      tags.push("General");
    }

    // Keep unique tags
    const uniqueTags = Array.from(new Set(tags));

    const newSession = await PracticeSession.create({
      userId: payload.userId,
      title: title.trim(),
      industry: industry || "Công nghệ thông tin",
      jobDescription: jobDescription || "",
      topic: topic || "",
      language: "vi-VN",
      voiceId: "vi-VN-HoaiMyNeural",
      difficulty: "Middle",
      questionCount: 3,
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
    console.error("POST /api/practice error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
