import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/app/lib/ConnectDB";
import { authenticateRequest } from "@/app/lib/Auth";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";

interface CompletedRun {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  evaluation?: {
    score?: number;
    duration?: string;
    durationSec?: number;
  };
  createdAt: Date;
}

async function GETHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập" },
        { status: 401 }
      );
    }

    await connectDB();
    const userId = new Types.ObjectId(payload.userId);
    const [statsRows, recentRuns] = await Promise.all([
      PracticeRun.aggregate<{
        totalInterviews: number;
        averageScore: number;
        totalDurationSec: number;
        communication?: number;
        knowledge?: number;
        problemSolving?: number;
        confidence?: number;
      }>([
        { $match: { userId, status: "COMPLETED" } },
        {
          $group: {
            _id: null,
            totalInterviews: { $sum: 1 },
            averageScore: { $avg: { $ifNull: ["$evaluation.score", 0] } },
            totalDurationSec: {
              $sum: { $ifNull: ["$evaluation.durationSec", 0] },
            },
            communication: { $avg: "$evaluation.ratings.communication" },
            knowledge: { $avg: "$evaluation.ratings.knowledge" },
            problemSolving: { $avg: "$evaluation.ratings.problemSolving" },
            confidence: { $avg: "$evaluation.ratings.confidence" },
          },
        },
        { $project: { _id: 0 } },
      ]),
      PracticeRun.find({ userId, status: "COMPLETED" })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("sessionId evaluation createdAt")
        .lean<CompletedRun[]>(),
    ]);

    const sessionIds = recentRuns.map((run) => run.sessionId);
    const sessions = await PracticeSession.find({
      _id: { $in: sessionIds },
      userId,
    })
      .select("title")
      .lean<Array<{ _id: Types.ObjectId; title: string }>>();
    const titleBySessionId = new Map(
      sessions.map((session) => [session._id.toString(), session.title])
    );
    const stats = statsRows[0] || {
      totalInterviews: 0,
      averageScore: 0,
      totalDurationSec: 0,
      communication: 0,
      knowledge: 0,
      problemSolving: 0,
      confidence: 0,
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalInterviews: stats.totalInterviews,
        averageScore: Number((stats.averageScore || 0).toFixed(1)),
        totalDurationSec: Math.round(stats.totalDurationSec || 0),
        ratings: {
          communication: stats.communication ? Math.round(stats.communication) : 0,
          knowledge: stats.knowledge ? Math.round(stats.knowledge) : 0,
          problemSolving: stats.problemSolving ? Math.round(stats.problemSolving) : 0,
          confidence: stats.confidence ? Math.round(stats.confidence) : 0,
        },
      },
      recentSessions: recentRuns.map((run) => ({
        id: run._id.toString(),
        sessionId: run.sessionId.toString(),
        position:
          titleBySessionId.get(run.sessionId.toString()) || "Buổi phỏng vấn",
        date: run.createdAt.toISOString(),
        duration: run.evaluation?.duration || "0 phút",
        durationSec: Math.round(run.evaluation?.durationSec || 0),
        score: Math.round(run.evaluation?.score || 0),
        status: "completed" as const,
      })),
    });
  } catch (error: unknown) {
    console.error("GET /api/practice/dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải thống kê luyện tập" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
