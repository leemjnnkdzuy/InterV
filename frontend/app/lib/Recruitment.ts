import "server-only";

import type { Types } from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import { sendRecruitmentInvitationEmail } from "@/app/lib/Email";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import User from "@/app/models/User";

const EMAIL_LEASE_MS = 2 * 60 * 1000;
const MAX_EMAIL_ATTEMPTS = 5;

function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL is required in production");
    }
    return "http://localhost:3000";
  }
  const origin = new URL(configured).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production");
  }
  return origin;
}

function safeEmailFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n]+/g, " ").slice(0, 400);
}

export async function expireRecruitmentInvitations(recruiterId?: string) {
  await connectDB();
  const now = new Date();
  const filter: Record<string, unknown> = {
    expiresAt: { $lt: now },
    status: { $in: ["INVITED", "VIEWED"] },
  };
  if (recruiterId) {
    filter.recruiterId = recruiterId;
  }
  await RecruitmentInvitation.updateMany(filter, {
    $set: { status: "EXPIRED" },
  });
}

export async function dispatchRecruitmentInvitation(
  invitationId: string | Types.ObjectId
) {
  await connectDB();
  const now = new Date();
  const invitation = await RecruitmentInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      status: { $in: ["INVITED", "VIEWED"] },
      emailStatus: { $ne: "SENT" },
      emailAttempts: { $lt: MAX_EMAIL_ATTEMPTS },
      $or: [
        { emailLeaseExpiresAt: { $exists: false } },
        { emailLeaseExpiresAt: null },
        { emailLeaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        emailStatus: "SENDING",
        emailLeaseExpiresAt: new Date(Date.now() + EMAIL_LEASE_MS),
      },
      $inc: { emailAttempts: 1 },
      $unset: { emailLastError: "" },
    },
    { returnDocument: "after" }
  ).lean();

  if (!invitation) {
    return { delivered: false, skipped: true };
  }

  try {
    const [campaign, candidate, recruiter] = await Promise.all([
      RecruitmentCampaign.findOne({
        _id: invitation.campaignId,
        status: { $in: ["ACTIVE", "DRAFT"] },
      })
        .select(
          "title jobTitle startsAt endsAt invitationMessage status"
        )
        .lean(),
      User.findOne({
        _id: invitation.candidateId,
        isActive: true,
        role: "user",
      })
        .select("username email")
        .lean(),
      User.findOne({
        _id: invitation.recruiterId,
        isActive: true,
        role: "recruiter",
      })
        .select("username")
        .lean(),
    ]);
    if (!campaign || !candidate || !recruiter) {
      throw new Error("Invitation participants are no longer eligible");
    }

    const result = await sendRecruitmentInvitationEmail({
      email: candidate.email,
      candidateName: candidate.username,
      recruiterName: recruiter.username,
      campaignTitle: campaign.title,
      jobTitle: campaign.jobTitle,
      interviewUrl: `${appOrigin()}/practice/${invitation.practiceSessionId.toString()}`,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      invitationMessage: campaign.invitationMessage,
    });
    if (!result.success) {
      throw new Error(result.error || "SMTP delivery failed");
    }

    await RecruitmentInvitation.updateOne(
      { _id: invitation._id, emailStatus: "SENDING" },
      {
        $set: {
          emailStatus: "SENT",
          sentAt: new Date(),
        },
        $unset: {
          emailLeaseExpiresAt: "",
          emailLastError: "",
        },
      }
    );
    return { delivered: true, skipped: false };
  } catch (error: unknown) {
    console.error(
      `Invitation ${invitation._id.toString()} delivery failed:`,
      error
    );
    await RecruitmentInvitation.updateOne(
      { _id: invitation._id, emailStatus: "SENDING" },
      {
        $set: {
          emailStatus: "FAILED",
          emailLastError: safeEmailFailure(error),
        },
        $unset: { emailLeaseExpiresAt: "" },
      }
    );
    return { delivered: false, skipped: false };
  }
}

export async function dispatchRecruitmentInvitationBatch(
  invitationIds: Array<string | Types.ObjectId>,
  concurrency = 3
) {
  const results: Array<{ delivered: boolean; skipped: boolean }> = [];
  for (let index = 0; index < invitationIds.length; index += concurrency) {
    const batch = invitationIds.slice(index, index + concurrency);
    results.push(
      ...(await Promise.all(
        batch.map((invitationId) =>
          dispatchRecruitmentInvitation(invitationId)
        )
      ))
    );
  }
  return results;
}
