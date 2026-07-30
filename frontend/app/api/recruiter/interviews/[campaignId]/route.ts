import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import type { IPracticeSession } from "@/app/types";

const CAMPAIGN_STATUSES = new Set(["ACTIVE", "CLOSED", "ARCHIVED"]);

async function ownedCampaign(campaignId: string, recruiterId: string) {
  if (!mongoose.isValidObjectId(campaignId)) {
    return null;
  }
  return RecruitmentCampaign.findOne({
    _id: campaignId,
    recruiterId,
  });
}

export async function GET(
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
    const { campaignId } = await params;
    await connectDB();
    const campaign = await ownedCampaign(
      campaignId,
      authorization.principal.payload.userId
    );
    if (!campaign) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy cuộc phỏng vấn" },
        { status: 404 }
      );
    }
    const invitations = await RecruitmentInvitation.find({
      campaignId: campaign._id,
      recruiterId: authorization.principal.payload.userId,
    })
      .populate("candidateId", "username email avatar isActive")
      .populate(
        "practiceSessionId",
        "attemptCount highestScore latestResult updatedAt"
      )
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign._id.toString(),
        title: campaign.title,
        jobTitle: campaign.jobTitle,
        department: campaign.department,
        industry: campaign.industry,
        employmentType: campaign.employmentType,
        workMode: campaign.workMode,
        location: campaign.location,
        jobDescription: campaign.jobDescription,
        topic: campaign.topic,
        language: campaign.language,
        voiceId: campaign.voiceId,
        difficulty: campaign.difficulty,
        questionCount: campaign.questionCount,
        maxAttempts: campaign.maxAttempts,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        invitationMessage: campaign.invitationMessage,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
      invitations: invitations.map((invitation) => {
        const candidate =
          invitation.candidateId &&
          typeof invitation.candidateId === "object" &&
          "username" in invitation.candidateId &&
          "email" in invitation.candidateId &&
          "avatar" in invitation.candidateId &&
          "isActive" in invitation.candidateId
            ? invitation.candidateId
            : null;
        const practice =
          invitation.practiceSessionId &&
          typeof invitation.practiceSessionId === "object" &&
          "attemptCount" in invitation.practiceSessionId &&
          "highestScore" in invitation.practiceSessionId
            ? (invitation.practiceSessionId as unknown as {
                _id: { toString(): string };
                attemptCount: number;
                highestScore: number;
                latestResult?: IPracticeSession["latestResult"];
              })
            : null;
        return {
          id: invitation._id.toString(),
          candidate: candidate
            ? {
                id: String(candidate._id),
                username: String(candidate.username),
                email: String(candidate.email),
                avatar: String(candidate.avatar || ""),
                isActive: Boolean(candidate.isActive),
              }
            : null,
          practiceSessionId: practice
            ? String(practice._id)
            : String(invitation.practiceSessionId),
          status: invitation.status,
          emailStatus: invitation.emailStatus,
          emailAttempts: invitation.emailAttempts,
          emailLastError: invitation.emailLastError,
          invitedAt: invitation.invitedAt,
          sentAt: invitation.sentAt,
          viewedAt: invitation.viewedAt,
          startedAt: invitation.startedAt,
          completedAt: invitation.completedAt,
          expiresAt: invitation.expiresAt,
          finalScore: invitation.finalScore ?? practice?.highestScore,
          attemptCount: practice?.attemptCount || 0,
          latestResult: practice?.latestResult,
        };
      }),
    });
  } catch (error: unknown) {
    console.error("GET /api/recruiter/interviews/[campaignId] error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải chi tiết cuộc phỏng vấn" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = (await readJsonBodyLimited(
      request,
      32 * 1024
    )) as Record<string, unknown>;
    await connectDB();
    await enforceRateLimit(
      "recruiter:update-campaign",
      actor.payload.userId,
      120,
      60 * 60 * 1000
    );
    const campaign = await ownedCampaign(campaignId, actor.payload.userId);
    if (!campaign) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy cuộc phỏng vấn" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};
    for (const [field, maximum] of [
      ["title", 160],
      ["jobTitle", 120],
      ["department", 120],
      ["location", 200],
      ["invitationMessage", 2_000],
    ] as const) {
      if (body[field] !== undefined) {
        if (
          typeof body[field] !== "string" ||
          (body[field] as string).trim().length > maximum ||
          ((field === "title" || field === "jobTitle") &&
            (body[field] as string).trim().length < 2)
        ) {
          return NextResponse.json(
            { success: false, message: `Trường ${field} không hợp lệ` },
            { status: 400 }
          );
        }
        updates[field] = (body[field] as string).trim();
      }
    }
    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !CAMPAIGN_STATUSES.has(body.status)
      ) {
        return NextResponse.json(
          { success: false, message: "Trạng thái không hợp lệ" },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }
    if (body.endsAt !== undefined) {
      const endsAt = new Date(String(body.endsAt));
      if (
        Number.isNaN(endsAt.getTime()) ||
        endsAt.getTime() <= Date.now() + 5 * 60 * 1000 ||
        (campaign.startsAt &&
          endsAt.getTime() <= campaign.startsAt.getTime())
      ) {
        return NextResponse.json(
          { success: false, message: "Hạn hoàn thành không hợp lệ" },
          { status: 400 }
        );
      }
      updates.endsAt = endsAt;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "Không có thay đổi hợp lệ" },
        { status: 400 }
      );
    }

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        const transactionalCampaign = await RecruitmentCampaign.findOne({
          _id: campaignId,
          recruiterId: actor.payload.userId,
        }).session(dbSession);
        if (!transactionalCampaign) {
          throw new Error("CAMPAIGN_NOT_FOUND");
        }
        if (transactionalCampaign.status === "ARCHIVED") {
          throw new Error("CAMPAIGN_ARCHIVED");
        }
        if (
          updates.endsAt instanceof Date &&
          transactionalCampaign.startsAt &&
          updates.endsAt.getTime() <=
            transactionalCampaign.startsAt.getTime()
        ) {
          throw new Error("CAMPAIGN_DATE_CONFLICT");
        }
        const effectiveEndsAt =
          updates.endsAt instanceof Date
            ? updates.endsAt
            : transactionalCampaign.endsAt;
        if (
          updates.status === "ACTIVE" &&
          effectiveEndsAt.getTime() <= Date.now() + 5 * 60 * 1000
        ) {
          throw new Error("CAMPAIGN_EXPIRED");
        }
        const activeAttemptCount =
          await RecruitmentInvitation.countDocuments({
            campaignId: transactionalCampaign._id,
            status: { $in: ["IN_PROGRESS", "COMPLETED"] },
          }).session(dbSession);
        if (
          activeAttemptCount > 0 &&
          (updates.title !== undefined || updates.jobTitle !== undefined)
        ) {
          throw new Error("CAMPAIGN_TITLE_LOCKED");
        }

        Object.assign(transactionalCampaign, updates);
        await transactionalCampaign.save({ session: dbSession });
        const sessionUpdates: Record<string, unknown> = {};
        if (updates.title !== undefined) sessionUpdates.title = updates.title;
        if (updates.endsAt !== undefined) {
          sessionUpdates.expiresAt = updates.endsAt;
        }
        if (Object.keys(sessionUpdates).length > 0) {
          await PracticeSession.updateMany(
            {
              recruitmentCampaignId: transactionalCampaign._id,
              recruiterId: actor.payload.userId,
              attemptCount: 0,
            },
            { $set: sessionUpdates },
            { session: dbSession }
          );
        }
        if (updates.endsAt !== undefined) {
          await RecruitmentInvitation.updateMany(
            {
              campaignId: transactionalCampaign._id,
              status: { $in: ["INVITED", "VIEWED"] },
            },
            { $set: { expiresAt: updates.endsAt } },
            { session: dbSession }
          );
        }
        if (updates.status === "ARCHIVED") {
          await RecruitmentInvitation.updateMany(
            {
              campaignId: transactionalCampaign._id,
              status: { $nin: ["COMPLETED", "CANCELLED"] },
            },
            { $set: { status: "CANCELLED" } },
            { session: dbSession }
          );
        }
        await recordAdminAudit({
          request,
          actorId: actor.payload.userId,
          actorRole: actor.user.role,
          action: "RECRUITMENT_CAMPAIGN_UPDATED",
          targetType: "RecruitmentCampaign",
          targetId: transactionalCampaign._id.toString(),
          summary: `Cập nhật chiến dịch "${transactionalCampaign.title}"`,
          changes: updates,
          session: dbSession,
        });
      });
    } finally {
      await dbSession.endSession();
    }
    return NextResponse.json({
      success: true,
      message: "Đã cập nhật cuộc phỏng vấn",
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn cập nhật chiến dịch quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu quá lớn" },
        { status: 413 }
      );
    }
    if (
      error instanceof Error &&
      error.message === "CAMPAIGN_TITLE_LOCKED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không thể đổi tiêu đề khi đã có ứng viên bắt đầu phỏng vấn",
        },
        { status: 409 }
      );
    }
    const campaignErrors: Record<string, [string, number]> = {
      CAMPAIGN_NOT_FOUND: ["Không tìm thấy cuộc phỏng vấn", 404],
      CAMPAIGN_ARCHIVED: [
        "Chiến dịch đã lưu trữ và không thể chỉnh sửa",
        409,
      ],
      CAMPAIGN_DATE_CONFLICT: ["Hạn hoàn thành không hợp lệ", 400],
      CAMPAIGN_EXPIRED: [
        "Hãy gia hạn chiến dịch trước khi mở lại",
        409,
      ],
    };
    const campaignError =
      error instanceof Error ? campaignErrors[error.message] : undefined;
    if (campaignError) {
      return NextResponse.json(
        { success: false, message: campaignError[0] },
        { status: campaignError[1] }
      );
    }
    console.error("PATCH /api/recruiter/interviews/[campaignId] error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật cuộc phỏng vấn" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const forwardedRequest = new NextRequest(request.url, {
    method: "PATCH",
    headers: request.headers,
    body: JSON.stringify({ status: "ARCHIVED" }),
  });
  return PATCH(forwardedRequest, { params });
}
