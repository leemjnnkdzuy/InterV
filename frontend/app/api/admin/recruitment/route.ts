import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const page = Math.max(
      1,
      Math.min(10_000, Number(request.nextUrl.searchParams.get("page")) || 1)
    );
    const limit = Math.max(
      10,
      Math.min(100, Number(request.nextUrl.searchParams.get("limit")) || 20)
    );
    const status = request.nextUrl.searchParams.get("status") || "all";
    if (
      !["all", "DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"].includes(status)
    ) {
      return NextResponse.json(
        { success: false, message: "Trạng thái chiến dịch không hợp lệ" },
        { status: 400 }
      );
    }
    const filter =
      status === "all" ? {} : { status: status as "ACTIVE" | "CLOSED" };

    await connectDB();
    const [campaigns, total, statusCounts] = await Promise.all([
      RecruitmentCampaign.find(filter)
        .select(
          "recruiterId title jobTitle industry status startsAt endsAt createdAt"
        )
        .populate("recruiterId", "username email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RecruitmentCampaign.countDocuments(filter),
      RecruitmentCampaign.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);
    const campaignIds = campaigns.map((campaign) => campaign._id);
    const invitationStats = await RecruitmentInvitation.aggregate<{
      _id: unknown;
      total: number;
      completed: number;
      inProgress: number;
      emailFailures: number;
    }>([
      { $match: { campaignId: { $in: campaignIds } } },
      {
        $group: {
          _id: "$campaignId",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] },
          },
          emailFailures: {
            $sum: { $cond: [{ $eq: ["$emailStatus", "FAILED"] }, 1, 0] },
          },
        },
      },
    ]);
    const statsMap = new Map(
      invitationStats.map((item) => [String(item._id), item])
    );

    return NextResponse.json({
      success: true,
      campaigns: campaigns.map((campaign) => {
        const stats = statsMap.get(campaign._id.toString());
        const recruiter =
          campaign.recruiterId &&
          typeof campaign.recruiterId === "object" &&
          "username" in campaign.recruiterId &&
          "email" in campaign.recruiterId
            ? campaign.recruiterId
            : null;
        return {
          id: campaign._id.toString(),
          title: campaign.title,
          jobTitle: campaign.jobTitle,
          industry: campaign.industry,
          status: campaign.status,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          createdAt: campaign.createdAt,
          recruiter: recruiter
            ? {
                username: String(recruiter.username),
                email: String(recruiter.email),
              }
            : null,
          invitations: {
            total: stats?.total || 0,
            completed: stats?.completed || 0,
            inProgress: stats?.inProgress || 0,
            emailFailures: stats?.emailFailures || 0,
          },
        };
      }),
      counts: Object.fromEntries(
        statusCounts.map((item) => [item._id, item.count])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/recruitment error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải hoạt động tuyển dụng" },
      { status: 500 }
    );
  }
}
