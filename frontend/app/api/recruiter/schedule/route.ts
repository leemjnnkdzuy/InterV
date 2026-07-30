import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["recruiter"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const recruiterId = authorization.principal.payload.userId;
    const fromValue = request.nextUrl.searchParams.get("from");
    const toValue = request.nextUrl.searchParams.get("to");
    const from = fromValue ? new Date(fromValue) : new Date();
    const to = toValue
      ? new Date(toValue)
      : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      to <= from ||
      to.getTime() - from.getTime() > 180 * 24 * 60 * 60 * 1000
    ) {
      return NextResponse.json(
        { success: false, message: "Khoảng thời gian không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();
    const campaigns = await RecruitmentCampaign.find({
      recruiterId,
      status: { $in: ["ACTIVE", "CLOSED"] },
      $or: [
        { startsAt: { $gte: from, $lte: to } },
        { endsAt: { $gte: from, $lte: to } },
        { startsAt: { $lte: from }, endsAt: { $gte: to } },
      ],
    })
      .select("title jobTitle startsAt endsAt status")
      .sort({ startsAt: 1, endsAt: 1 })
      .lean();
    const stats = await RecruitmentInvitation.aggregate<{
      _id: unknown;
      total: number;
      completed: number;
      inProgress: number;
    }>([
      { $match: { campaignId: { $in: campaigns.map((item) => item._id) } } },
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
        },
      },
    ]);
    const statsMap = new Map(stats.map((item) => [String(item._id), item]));
    return NextResponse.json({
      success: true,
      range: { from, to },
      events: campaigns.flatMap((campaign) => {
        const campaignStats = statsMap.get(campaign._id.toString());
        const common = {
          campaignId: campaign._id.toString(),
          title: campaign.title,
          jobTitle: campaign.jobTitle,
          status: campaign.status,
          candidates: campaignStats?.total || 0,
          completed: campaignStats?.completed || 0,
          inProgress: campaignStats?.inProgress || 0,
        };
        const events = [];
        if (campaign.startsAt) {
          events.push({
            ...common,
            id: `${campaign._id.toString()}-start`,
            type: "START",
            at: campaign.startsAt,
          });
        }
        events.push({
          ...common,
          id: `${campaign._id.toString()}-deadline`,
          type: "DEADLINE",
          at: campaign.endsAt,
        });
        return events;
      }),
    });
  } catch (error: unknown) {
    console.error("GET /api/recruiter/schedule error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải lịch tuyển dụng" },
      { status: 500 }
    );
  }
}
