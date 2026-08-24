import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import PracticeRun from "@/app/models/PracticeRun";

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username không hợp lệ" },
        { status: 400 }
      );
    }

    const lowercaseUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(lowercaseUsername)) {
      return NextResponse.json(
        { success: false, message: "Username không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();
    const user = await User.findOne({
      username: lowercaseUsername,
      isActive: true,
    })
      .select(
        "username email role avatar dob socialLinks fullName gender headline targetRole targetIndustry skills education workExperience cvFile isOnboarded createdAt"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const statsRows = await PracticeRun.aggregate<{
      totalInterviews: number;
      averageScore: number;
      totalDurationSec: number;
      communication?: number;
      knowledge?: number;
      problemSolving?: number;
      confidence?: number;
    }>([
      { $match: { userId: user._id, status: "COMPLETED" } },
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
    ]);

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
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "user",
        avatar: user.avatar,
        dob: user.dob,
        socialLinks: user.socialLinks || [],
        fullName: user.fullName || "",
        gender: user.gender || "",
        headline: user.headline || "",
        targetRole: user.targetRole || "",
        targetIndustry: user.targetIndustry || "",
        skills: user.skills || [],
        education: user.education || [],
        workExperience: user.workExperience || [],
        cvFile: user.cvFile,
        isOnboarded: user.isOnboarded ?? false,
        createdAt: user.createdAt,
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
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/users/[username] error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
