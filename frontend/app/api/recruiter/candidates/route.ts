import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { expireRecruitmentInvitations } from "@/app/lib/Recruitment";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import User from "@/app/models/User";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    const page = Math.max(
      1,
      Math.min(10_000, Number(request.nextUrl.searchParams.get("page")) || 1)
    );
    const limit = Math.max(
      10,
      Math.min(100, Number(request.nextUrl.searchParams.get("limit")) || 25)
    );
    const status = request.nextUrl.searchParams.get("status") || "all";
    const query = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .slice(0, 100);
    const allowedStatuses = [
      "all",
      "INVITED",
      "VIEWED",
      "IN_PROGRESS",
      "COMPLETED",
      "EXPIRED",
      "CANCELLED",
    ];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Trạng thái không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();
    await expireRecruitmentInvitations(recruiterId);
    const filter: Record<string, unknown> = { recruiterId };
    if (status !== "all") {
      filter.status = status;
    }
    if (query) {
      const regex = new RegExp(escapeRegExp(query), "i");
      const candidateIds = await User.find({
        $or: [{ username: regex }, { email: regex }],
      }).distinct("_id");
      filter.candidateId = { $in: candidateIds };
    }
    const [invitations, total, counts] = await Promise.all([
      RecruitmentInvitation.find(filter)
        .populate("candidateId", "username email avatar isActive")
        .populate("campaignId", "title jobTitle status endsAt")
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RecruitmentInvitation.countDocuments(filter),
      RecruitmentInvitation.aggregate<{ _id: string; count: number }>([
        { $match: { recruiterId: authorization.principal.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);
    return NextResponse.json({
      success: true,
      candidates: invitations.map((invitation) => {
        const candidate =
          invitation.candidateId &&
          typeof invitation.candidateId === "object" &&
          "username" in invitation.candidateId &&
          "email" in invitation.candidateId &&
          "avatar" in invitation.candidateId &&
          "isActive" in invitation.candidateId
            ? invitation.candidateId
            : null;
        const campaign =
          invitation.campaignId &&
          typeof invitation.campaignId === "object" &&
          "title" in invitation.campaignId &&
          "jobTitle" in invitation.campaignId &&
          "status" in invitation.campaignId &&
          "endsAt" in invitation.campaignId
            ? invitation.campaignId
            : null;
        return {
          invitationId: invitation._id.toString(),
          candidate: candidate
            ? {
                id: String(candidate._id),
                username: String(candidate.username),
                email: String(candidate.email),
                avatar: String(candidate.avatar || ""),
                isActive: Boolean(candidate.isActive),
              }
            : null,
          campaign: campaign
            ? {
                id: String(campaign._id),
                title: String(campaign.title),
                jobTitle: String(campaign.jobTitle),
                status: String(campaign.status),
                endsAt: campaign.endsAt,
              }
            : null,
          practiceSessionId: invitation.practiceSessionId.toString(),
          status: invitation.status,
          emailStatus: invitation.emailStatus,
          finalScore: invitation.finalScore,
          invitedAt: invitation.invitedAt,
          sentAt: invitation.sentAt,
          startedAt: invitation.startedAt,
          completedAt: invitation.completedAt,
          expiresAt: invitation.expiresAt,
        };
      }),
      counts: Object.fromEntries(
        counts.map((item) => [item._id, item.count])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/recruiter/candidates error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách ứng viên" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
