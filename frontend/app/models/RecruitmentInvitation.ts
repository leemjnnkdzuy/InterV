import mongoose, { Model, Schema } from "mongoose";

import type { IRecruitmentInvitation } from "@/app/types";

const recruitmentInvitationSchema = new Schema<IRecruitmentInvitation>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "RecruitmentCampaign",
      required: true,
      index: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    practiceSessionId: {
      type: Schema.Types.ObjectId,
      ref: "PracticeSession",
      required: true,
      unique: true,
    },
    candidateEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    status: {
      type: String,
      enum: [
        "INVITED",
        "VIEWED",
        "IN_PROGRESS",
        "COMPLETED",
        "EXPIRED",
        "CANCELLED",
      ],
      default: "INVITED",
      index: true,
    },
    emailStatus: {
      type: String,
      enum: ["PENDING", "SENDING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },
    emailAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
    },
    emailLastError: {
      type: String,
      maxlength: 500,
    },
    emailLeaseExpiresAt: {
      type: Date,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
    },
    viewedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastRunId: {
      type: Schema.Types.ObjectId,
      ref: "PracticeRun",
    },
    finalScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

recruitmentInvitationSchema.index(
  { campaignId: 1, candidateId: 1 },
  { unique: true }
);
recruitmentInvitationSchema.index({ recruiterId: 1, status: 1, updatedAt: -1 });
recruitmentInvitationSchema.index({ candidateId: 1, status: 1, expiresAt: 1 });

if (mongoose.models.RecruitmentInvitation) {
  delete mongoose.models.RecruitmentInvitation;
}

const RecruitmentInvitation: Model<IRecruitmentInvitation> =
  mongoose.model<IRecruitmentInvitation>(
    "RecruitmentInvitation",
    recruitmentInvitationSchema
  );

export default RecruitmentInvitation;
