import { withApiLogging } from "@/app/lib/ApiLogging";
import { after, NextRequest, NextResponse } from "next/server";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  dispatchRecruitmentInvitationBatch,
  expireRecruitmentInvitations,
} from "@/app/lib/Recruitment";
import {
  createRecruitmentCampaign,
  resolveEligibleCandidates,
  validateRecruitmentCampaignInput,
} from "@/app/lib/RecruitmentWorkflow";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
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
    const [campaigns, total] = await Promise.all([
      RecruitmentCampaign.find(filter)
        .select(
          "title jobTitle department industry status startsAt endsAt questionCount difficulty createdAt"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RecruitmentCampaign.countDocuments(filter),
    ]);
    const invitationStats = await RecruitmentInvitation.aggregate<{
      _id: unknown;
      total: number;
      completed: number;
      inProgress: number;
      invited: number;
      emailFailures: number;
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
          invited: {
            $sum: {
              $cond: [
                { $in: ["$status", ["INVITED", "VIEWED"]] },
                1,
                0,
              ],
            },
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
      campaigns: campaigns.map((campaign) => ({
        id: campaign._id.toString(),
        title: campaign.title,
        jobTitle: campaign.jobTitle,
        department: campaign.department,
        industry: campaign.industry,
        status: campaign.status,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        questionCount: campaign.questionCount,
        difficulty: campaign.difficulty,
        createdAt: campaign.createdAt,
        invitations: statsMap.get(campaign._id.toString()) || {
          total: 0,
          completed: 0,
          inProgress: 0,
          invited: 0,
          emailFailures: 0,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/recruiter/interviews error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách phỏng vấn" },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["recruiter"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const actor = authorization.principal;
    await connectDB();
    await enforceRateLimit(
      "recruiter:create-campaign",
      actor.payload.userId,
      30,
      60 * 60 * 1000
    );
    const body = (await readJsonBodyLimited(
      request,
      128 * 1024
    )) as Record<string, unknown>;
    const validation = validateRecruitmentCampaignInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }
    const eligibility = await resolveEligibleCandidates(
      validation.data.candidateEmails
    );
    if (eligibility.invalidEmails.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Một số email không thuộc tài khoản ứng viên đang hoạt động và đã xác minh",
          invalidEmails: eligibility.invalidEmails,
        },
        { status: 422 }
      );
    }
    const created = await createRecruitmentCampaign({
      recruiterId: actor.payload.userId,
      campaign: validation.data,
      candidates: eligibility.candidates,
    });
    await recordAdminAudit({
      request,
      actorId: actor.payload.userId,
      actorRole: actor.user.role,
      action: "RECRUITMENT_CAMPAIGN_CREATED",
      targetType: "RecruitmentCampaign",
      targetId: created.campaignId,
      summary: `Tạo chiến dịch "${validation.data.title}" với ${eligibility.candidates.length} ứng viên`,
      changes: {
        candidateCount: eligibility.candidates.length,
        questionCount: validation.data.questionCount,
        endsAt: validation.data.endsAt.toISOString(),
      },
    });
    after(async () => {
      await dispatchRecruitmentInvitationBatch(created.invitationIds);
    });
    return NextResponse.json(
      {
        success: true,
        message:
          "Đã tạo cuộc phỏng vấn. Thư mời đang được gửi tự động đến ứng viên.",
        campaignId: created.campaignId,
        invitationCount: created.invitationIds.length,
        emailDispatch: "QUEUED",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đã tạo quá nhiều chiến dịch" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu chiến dịch quá lớn" },
        { status: 413 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "JSON không hợp lệ" },
        { status: 400 }
      );
    }
    console.error("POST /api/recruiter/interviews error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo cuộc phỏng vấn" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
export const POST = withApiLogging(POSTHandler);
