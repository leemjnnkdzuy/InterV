import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import PracticeSession from "@/app/models/PracticeSession";
import { verifyAccessToken } from "@/app/lib/Auth";

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
      .lean();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s: any) => ({
        id: s._id.toString(),
        title: s.title,
        jobDescription: s.jobDescription,
        topic: s.topic,
        industry: s.industry,
        tags: s.tags || [],
        attemptCount: s.attemptCount || 0,
        highestScore: s.highestScore || 0,
        latestResult: s.latestResult,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error: any) {
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
    const tags = [];
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
        tags: newSession.tags,
        attemptCount: newSession.attemptCount,
        highestScore: newSession.highestScore,
        createdAt: newSession.createdAt,
        updatedAt: newSession.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/practice error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
