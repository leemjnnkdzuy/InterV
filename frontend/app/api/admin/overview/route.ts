import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import AdminAuditLog from "@/app/models/AdminAuditLog";
import PracticeRun from "@/app/models/PracticeRun";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import User from "@/app/models/User";

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }

    await connectDB();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    const [
      totalUsers,
      activeUsers,
      regularUsers,
      recruiters,
      admins,
      activeCampaigns,
      totalCampaigns,
      totalInvitations,
      completedInvitations,
      completedRuns,
      recentUsers,
      recentAudits,
      signupTrend,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "recruiter" }),
      User.countDocuments({ role: "admin" }),
      RecruitmentCampaign.countDocuments({ status: "ACTIVE" }),
      RecruitmentCampaign.countDocuments(),
      RecruitmentInvitation.countDocuments(),
      RecruitmentInvitation.countDocuments({ status: "COMPLETED" }),
      PracticeRun.countDocuments({ status: "COMPLETED" }),
      User.find()
        .select("username email role avatar isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      AdminAuditLog.find()
        .select("action targetType summary actorId createdAt")
        .populate("actorId", "username")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      User.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const trendMap = new Map(signupTrend.map((item) => [item._id, item.count]));
    const trend = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(sevenDaysAgo);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: trendMap.get(key) || 0 };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        regularUsers,
        recruiters,
        admins,
        activeCampaigns,
        totalCampaigns,
        totalInvitations,
        completedInvitations,
        completionRate:
          totalInvitations > 0
            ? Math.round((completedInvitations / totalInvitations) * 1000) / 10
            : 0,
        completedRuns,
      },
      signupTrend: trend,
      recentUsers: recentUsers.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
      recentAudits: recentAudits.map((audit) => ({
        id: audit._id.toString(),
        action: audit.action,
        targetType: audit.targetType,
        summary: audit.summary,
        actor:
          audit.actorId &&
          typeof audit.actorId === "object" &&
          "username" in audit.actorId
            ? String(audit.actorId.username)
            : "Hệ thống",
        createdAt: audit.createdAt,
      })),
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải tổng quan quản trị" },
      { status: 500 }
    );
  }
}
