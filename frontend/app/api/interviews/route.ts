import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import User from "@/app/models/User";
import type {
  RecruitmentCampaignStatus,
  RecruitmentInvitationStatus,
  UserInterviewItem,
} from "@/app/types";

interface InvitationRow {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  practiceSessionId: Types.ObjectId;
  status: RecruitmentInvitationStatus;
  invitedAt: Date;
  viewedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  finalScore?: number;
  lastRunId?: Types.ObjectId;
}

interface CampaignRow {
  _id: Types.ObjectId;
  title: string;
  jobTitle: string;
  department?: string;
  industry: string;
  employmentType: string;
  workMode: string;
  location?: string;
  language: string;
  difficulty: string;
  questionCount: number;
  maxAttempts: number;
  startsAt?: Date;
  endsAt: Date;
  invitationMessage?: string;
  status: RecruitmentCampaignStatus;
}

interface PracticeRow {
  _id: Types.ObjectId;
  attemptCount: number;
  maxAttempts?: number;
  highestScore: number;
}

interface RecruiterRow {
  _id: Types.ObjectId;
  username: string;
  avatar?: string;
}

function toIso(value?: Date) {
  return value ? value.toISOString() : undefined;
}

async function GETHandler(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["user"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }

    await connectDB();
    const candidateId = new Types.ObjectId(
      authorization.principal.payload.userId
    );
    const now = new Date();

    await RecruitmentInvitation.updateMany(
      {
        candidateId,
        expiresAt: { $lte: now },
        status: { $in: ["INVITED", "VIEWED"] },
      },
      { $set: { status: "EXPIRED" } }
    );

    const invitations = await RecruitmentInvitation.find({ candidateId })
      .select(
        "campaignId recruiterId practiceSessionId status invitedAt viewedAt startedAt completedAt expiresAt finalScore lastRunId updatedAt"
      )
      .sort({ updatedAt: -1, _id: -1 })
      .limit(250)
      .lean<InvitationRow[]>();

    const campaignIds = invitations.map((item) => item.campaignId);
    const recruiterIds = invitations.map((item) => item.recruiterId);
    const practiceSessionIds = invitations.map(
      (item) => item.practiceSessionId
    );
    const [campaigns, recruiters, practices] = await Promise.all([
      RecruitmentCampaign.find({ _id: { $in: campaignIds } })
        .select(
          "title jobTitle department industry employmentType workMode location language difficulty questionCount maxAttempts startsAt endsAt invitationMessage status"
        )
        .lean<CampaignRow[]>(),
      User.find({
        _id: { $in: recruiterIds },
        role: "recruiter",
        isActive: true,
      })
        .select("username avatar")
        .lean<RecruiterRow[]>(),
      PracticeSession.find({
        _id: { $in: practiceSessionIds },
        userId: candidateId,
        source: "recruitment",
      })
        .select("attemptCount maxAttempts highestScore")
        .lean<PracticeRow[]>(),
    ]);

    const campaignById = new Map(
      campaigns.map((campaign) => [campaign._id.toString(), campaign])
    );
    const recruiterById = new Map(
      recruiters.map((recruiter) => [recruiter._id.toString(), recruiter])
    );
    const practiceById = new Map(
      practices.map((practice) => [practice._id.toString(), practice])
    );

    const interviews: UserInterviewItem[] = invitations.map((invitation) => {
      const campaign = campaignById.get(invitation.campaignId.toString());
      const recruiter = recruiterById.get(invitation.recruiterId.toString());
      const practice = practiceById.get(
        invitation.practiceSessionId.toString()
      );
      const campaignMaxAttempts = Math.max(1, campaign?.maxAttempts || 1);
      const sessionMaxAttempts = Math.max(
        1,
        practice?.maxAttempts || campaignMaxAttempts
      );

      return {
        id: invitation._id.toString(),
        practiceSessionId: invitation.practiceSessionId.toString(),
        status: invitation.status,
        invitedAt: invitation.invitedAt.toISOString(),
        viewedAt: toIso(invitation.viewedAt),
        startedAt: toIso(invitation.startedAt),
        completedAt: toIso(invitation.completedAt),
        expiresAt: invitation.expiresAt.toISOString(),
        finalScore: invitation.finalScore,
        lastRunId: invitation.lastRunId?.toString(),
        attemptCount: Math.max(0, practice?.attemptCount || 0),
        maxAttempts: sessionMaxAttempts,
        highestScore: Math.max(0, practice?.highestScore || 0),
        recruiter: recruiter
          ? {
              id: recruiter._id.toString(),
              username: recruiter.username,
              avatar: recruiter.avatar || "",
            }
          : null,
        campaign: campaign
          ? {
              id: campaign._id.toString(),
              title: campaign.title,
              jobTitle: campaign.jobTitle,
              department: campaign.department || "",
              industry: campaign.industry,
              employmentType: campaign.employmentType,
              workMode: campaign.workMode,
              location: campaign.location || "",
              language: campaign.language,
              difficulty: campaign.difficulty,
              questionCount: campaign.questionCount,
              startsAt: toIso(campaign.startsAt),
              endsAt: campaign.endsAt.toISOString(),
              invitationMessage: campaign.invitationMessage || "",
              status: campaign.status,
            }
          : null,
      };
    });

    const stats = interviews.reduce(
      (result, item) => {
        result.total += 1;
        if (["INVITED", "VIEWED"].includes(item.status)) {
          result.pending += 1;
        } else if (item.status === "IN_PROGRESS") {
          result.inProgress += 1;
        } else if (item.status === "COMPLETED") {
          result.completed += 1;
        }
        return result;
      },
      { total: 0, pending: 0, inProgress: 0, completed: 0 }
    );

    return NextResponse.json({
      success: true,
      stats,
      interviews,
    });
  } catch (error: unknown) {
    console.error("GET /api/interviews error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải các buổi phỏng vấn" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
