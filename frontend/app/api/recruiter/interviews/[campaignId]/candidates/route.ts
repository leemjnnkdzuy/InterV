import { after, NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { dispatchRecruitmentInvitationBatch } from "@/app/lib/Recruitment";
import { addCandidatesToCampaign } from "@/app/lib/RecruitmentWorkflow";
import {
  enforceRateLimit,
  normalizeEmail,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const authorization = await authorizeRequest(request, ["recruiter"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const actor = authorization.principal;
    const { campaignId } = await params;
    if (!mongoose.isValidObjectId(campaignId)) {
      return NextResponse.json(
        { success: false, message: "ID cuộc phỏng vấn không hợp lệ" },
        { status: 400 }
      );
    }
    const body = (await readJsonBodyLimited(
      request,
      16 * 1024
    )) as Record<string, unknown>;
    if (!Array.isArray(body.candidateEmails)) {
      return NextResponse.json(
        { success: false, message: "Danh sách email là bắt buộc" },
        { status: 400 }
      );
    }
    const candidateEmails = Array.from(
      new Set(body.candidateEmails.map(normalizeEmail).filter(Boolean))
    );
    if (
      candidateEmails.length < 1 ||
      candidateEmails.length > 50 ||
      candidateEmails.some((email) => !EMAIL_PATTERN.test(email))
    ) {
      return NextResponse.json(
        { success: false, message: "Danh sách email không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();
    await enforceRateLimit(
      "recruiter:add-candidates",
      actor.payload.userId,
      30,
      60 * 60 * 1000
    );
    const result = await addCandidatesToCampaign({
      recruiterId: actor.payload.userId,
      campaignId,
      candidateEmails,
    });
    if (!result.ok) {
      if (result.code === "CAMPAIGN_NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không tìm thấy chiến dịch hoặc chiến dịch không còn nhận ứng viên",
          },
          { status: 404 }
        );
      }
      if (result.code === "INVALID_CANDIDATES") {
        return NextResponse.json(
          {
            success: false,
            message: "Một số email không phải ứng viên hợp lệ",
            invalidEmails: result.invalidEmails,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          message: "Một số ứng viên đã có trong chiến dịch",
          duplicateEmails: result.duplicateEmails,
        },
        { status: 409 }
      );
    }
    await recordAdminAudit({
      request,
      actorId: actor.payload.userId,
      actorRole: actor.user.role,
      action: "RECRUITMENT_CANDIDATES_ADDED",
      targetType: "RecruitmentCampaign",
      targetId: campaignId,
      summary: `Thêm ${result.invitationIds.length} ứng viên vào chiến dịch`,
      changes: { candidateCount: result.invitationIds.length },
    });
    after(async () => {
      await dispatchRecruitmentInvitationBatch(result.invitationIds);
    });
    return NextResponse.json(
      {
        success: true,
        message: "Đã thêm ứng viên và xếp hàng gửi thư mời",
        invitationCount: result.invitationIds.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn đã thêm ứng viên quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu quá lớn" },
        { status: 413 }
      );
    }
    console.error(
      "POST /api/recruiter/interviews/[campaignId]/candidates error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Không thể thêm ứng viên" },
      { status: 500 }
    );
  }
}
