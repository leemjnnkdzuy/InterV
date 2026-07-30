import { withApiLogging } from "@/app/lib/ApiLogging";
import { after, NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { dispatchRecruitmentInvitation } from "@/app/lib/Recruitment";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";

async function PATCHHandler(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ campaignId: string; invitationId: string }>;
  }
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
    const { campaignId, invitationId } = await params;
    if (
      !mongoose.isValidObjectId(campaignId) ||
      !mongoose.isValidObjectId(invitationId)
    ) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }
    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    if (!["cancel", "resend"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Hành động không hợp lệ" },
        { status: 400 }
      );
    }
    await connectDB();
    await Promise.all([
      enforceRateLimit(
        "recruiter:invitation-action",
        actor.payload.userId,
        100,
        60 * 60 * 1000
      ),
      enforceRateLimit(
        "recruiter:invitation-action:item",
        `${actor.payload.userId}:${invitationId}`,
        5,
        60 * 60 * 1000
      ),
    ]);
    let dispatchInvitationId: mongoose.Types.ObjectId | null = null;
    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        const invitation = await RecruitmentInvitation.findOne({
          _id: invitationId,
          campaignId,
          recruiterId: actor.payload.userId,
        }).session(dbSession);
        if (!invitation) {
          throw new Error("INVITATION_NOT_FOUND");
        }
        if (["IN_PROGRESS", "COMPLETED"].includes(invitation.status)) {
          throw new Error("INVITATION_LOCKED");
        }
        if (action === "resend") {
          const activeCampaign = await RecruitmentCampaign.findOne({
            _id: campaignId,
            recruiterId: actor.payload.userId,
            status: { $in: ["DRAFT", "ACTIVE"] },
            endsAt: { $gt: new Date() },
          })
            .select("_id")
            .session(dbSession)
            .lean();
          if (!activeCampaign) {
            throw new Error("CAMPAIGN_NOT_ACTIVE");
          }
        }

        if (action === "cancel") {
          invitation.status = "CANCELLED";
        } else {
          invitation.status = "INVITED";
          invitation.emailStatus = "PENDING";
          invitation.emailAttempts = 0;
          invitation.emailLastError = undefined;
          invitation.emailLeaseExpiresAt = undefined;
          dispatchInvitationId = invitation._id;
        }
        await invitation.save({ session: dbSession });
        await recordAdminAudit({
          request,
          actorId: actor.payload.userId,
          actorRole: actor.user.role,
          action:
            action === "cancel"
              ? "RECRUITMENT_INVITATION_CANCELLED"
              : "RECRUITMENT_INVITATION_RESENT",
          targetType: "RecruitmentInvitation",
          targetId: invitation._id.toString(),
          summary:
            action === "cancel"
              ? `Hủy lời mời ${invitation.candidateEmail}`
              : `Gửi lại lời mời ${invitation.candidateEmail}`,
          session: dbSession,
        });
      });
    } finally {
      await dbSession.endSession();
    }
    if (dispatchInvitationId) {
      const queuedInvitationId = dispatchInvitationId;
      after(async () => {
        await dispatchRecruitmentInvitation(queuedInvitationId);
      });
    }
    return NextResponse.json({
      success: true,
      message:
        action === "cancel"
          ? "Đã hủy lời mời"
          : "Đã xếp hàng gửi lại thư mời",
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn thao tác với lời mời quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (
      error instanceof Error &&
      error.message === "INVITATION_NOT_FOUND"
    ) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lời mời" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "INVITATION_LOCKED") {
      return NextResponse.json(
        {
          success: false,
          message: "Không thể thay đổi lời mời đã bắt đầu hoặc hoàn thành",
        },
        { status: 409 }
      );
    }
    if (
      error instanceof Error &&
      error.message === "CAMPAIGN_NOT_ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Chỉ có thể gửi lại thư khi chiến dịch đang mở",
        },
        { status: 409 }
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu quá lớn" },
        { status: 413 }
      );
    }
    console.error("PATCH recruiter invitation error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật lời mời" },
      { status: 500 }
    );
  }
}

export const PATCH = withApiLogging(PATCHHandler);
