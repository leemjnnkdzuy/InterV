import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { expireRecruitmentInvitations } from "@/app/lib/Recruitment";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";

async function GETHandler(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["recruiter"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const recruiterId = authorization.principal.payload.userId;
    await connectDB();
    await expireRecruitmentInvitations(recruiterId);

    const [
      totalCampaigns,
      activeCampaigns,
      totalCandidates,
      completed,
      inProgress,
      emailFailures,
      upcomingCampaigns,
      recentCompletions,
      funnel,
    ] = await Promise.all([
      RecruitmentCampaign.countDocuments({
        recruiterId,
        status: { $ne: "ARCHIVED" },
      }),
      RecruitmentCampaign.countDocuments({
        recruiterId,
        status: "ACTIVE",
        endsAt: { $gte: new Date() },
      }),
      RecruitmentInvitation.countDocuments({ recruiterId }),
      RecruitmentInvitation.countDocuments({
        recruiterId,
        status: "COMPLETED",
      }),
      RecruitmentInvitation.countDocuments({
        recruiterId,
        status: "IN_PROGRESS",
      }),
      RecruitmentInvitation.countDocuments({
        recruiterId,
        emailStatus: "FAILED",
      }),
      RecruitmentCampaign.find({
        recruiterId,
        status: "ACTIVE",
        endsAt: { $gte: new Date() },
      })
        .select("title jobTitle startsAt endsAt")
        .sort({ endsAt: 1 })
        .limit(5)
        .lean(),
      RecruitmentInvitation.find({
        recruiterId,
        status: "COMPLETED",
      })
        .select(
          "campaignId candidateId practiceSessionId finalScore completedAt"
        )
        .populate("campaignId", "title jobTitle")
        .populate("candidateId", "username email avatar")
        .sort({ completedAt: -1 })
        .limit(6)
        .lean(),
      RecruitmentInvitation.aggregate<{ _id: string; count: number }>([
        { $match: { recruiterId: authorization.principal.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      metrics: {
        totalCampaigns,
        activeCampaigns,
        totalCandidates,
        completed,
        inProgress,
        emailFailures,
        completionRate:
          totalCandidates > 0
            ? Math.round((completed / totalCandidates) * 1000) / 10
            : 0,
      },
      funnel: Object.fromEntries(
        funnel.map((item) => [item._id, item.count])
      ),
      upcomingCampaigns: upcomingCampaigns.map((campaign) => ({
        id: campaign._id.toString(),
        title: campaign.title,
        jobTitle: campaign.jobTitle,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      })),
      recentCompletions: recentCompletions.map((invitation) => {
        const campaign =
          invitation.campaignId &&
          typeof invitation.campaignId === "object" &&
          "title" in invitation.campaignId &&
          "jobTitle" in invitation.campaignId
            ? invitation.campaignId
            : null;
        const candidate =
          invitation.candidateId &&
          typeof invitation.candidateId === "object" &&
          "username" in invitation.candidateId &&
          "email" in invitation.candidateId
            ? invitation.candidateId
            : null;
        return {
          id: invitation._id.toString(),
          campaign: campaign
            ? {
                title: String(campaign.title),
                jobTitle: String(campaign.jobTitle),
              }
            : null,
          candidate: candidate
            ? {
                username: String(candidate.username),
                email: String(candidate.email),
                avatar:
                  "avatar" in candidate ? String(candidate.avatar || "") : "",
              }
            : null,
          practiceSessionId: invitation.practiceSessionId.toString(),
          score: invitation.finalScore,
          completedAt: invitation.completedAt,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("GET /api/recruiter/overview error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải tổng quan tuyển dụng" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
