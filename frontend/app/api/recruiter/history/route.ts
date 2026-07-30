import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import type { IPracticeSession } from "@/app/types";

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["recruiter"]);
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
    const recruiterId = authorization.principal.payload.userId;
    await connectDB();
    const filter = { recruiterId, status: "COMPLETED" as const };
    const [invitations, total] = await Promise.all([
      RecruitmentInvitation.find(filter)
        .populate("candidateId", "username email avatar")
        .populate("campaignId", "title jobTitle department")
        .populate(
          "practiceSessionId",
          "title highestScore attemptCount latestResult"
        )
        .sort({ completedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RecruitmentInvitation.countDocuments(filter),
    ]);
    return NextResponse.json({
      success: true,
      interviews: invitations.map((invitation) => {
        const candidate =
          invitation.candidateId &&
          typeof invitation.candidateId === "object" &&
          "username" in invitation.candidateId &&
          "email" in invitation.candidateId &&
          "avatar" in invitation.candidateId
            ? invitation.candidateId
            : null;
        const campaign =
          invitation.campaignId &&
          typeof invitation.campaignId === "object" &&
          "title" in invitation.campaignId &&
          "jobTitle" in invitation.campaignId &&
          "department" in invitation.campaignId
            ? invitation.campaignId
            : null;
        const practice =
          invitation.practiceSessionId &&
          typeof invitation.practiceSessionId === "object" &&
          "latestResult" in invitation.practiceSessionId &&
          "highestScore" in invitation.practiceSessionId &&
          "attemptCount" in invitation.practiceSessionId
            ? (invitation.practiceSessionId as unknown as {
                _id: { toString(): string };
                latestResult?: IPracticeSession["latestResult"];
                highestScore: number;
                attemptCount: number;
              })
            : null;
        return {
          invitationId: invitation._id.toString(),
          practiceSessionId: practice
            ? String(practice._id)
            : String(invitation.practiceSessionId),
          candidate: candidate
            ? {
                username: String(candidate.username),
                email: String(candidate.email),
                avatar: String(candidate.avatar || ""),
              }
            : null,
          campaign: campaign
            ? {
                id: String(campaign._id),
                title: String(campaign.title),
                jobTitle: String(campaign.jobTitle),
                department: String(campaign.department || ""),
              }
            : null,
          score:
            invitation.finalScore ??
            practice?.highestScore ??
            practice?.latestResult?.score ??
            0,
          attemptCount: practice?.attemptCount || 0,
          result: practice?.latestResult || null,
          completedAt: invitation.completedAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/recruiter/history error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải lịch sử phỏng vấn" },
      { status: 500 }
    );
  }
}
