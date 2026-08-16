import mongoose, { Model, Schema } from "mongoose";

import type { IRecruitmentCampaign } from "@/app/types";

const recruitmentCampaignSchema = new Schema<IRecruitmentCampaign>(
  {
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 160,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    industry: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"],
      default: "FULL_TIME",
    },
    workMode: {
      type: String,
      enum: ["ONSITE", "HYBRID", "REMOTE"],
      default: "ONSITE",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    jobDescription: {
      type: String,
      required: true,
      maxlength: 50_000,
    },
    topic: {
      type: String,
      maxlength: 2_000,
      default: "",
    },
    language: {
      type: String,
      enum: ["vi-VN", "en-US", "zh-CN"],
      default: "vi-VN",
    },
    voiceId: {
      type: String,
      required: true,
      maxlength: 120,
      default: "hn_female_ngochuyen_full_48k-fhg",
    },
    difficulty: {
      type: String,
      required: true,
      maxlength: 80,
      default: "Middle",
    },
    questionCount: {
      type: Number,
      min: 5,
      max: 25,
      default: 5,
    },
    maxAttempts: {
      type: Number,
      min: 1,
      max: 3,
      default: 1,
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    invitationMessage: {
      type: String,
      maxlength: 2_000,
      default: "",
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

recruitmentCampaignSchema.index({ recruiterId: 1, createdAt: -1 });
recruitmentCampaignSchema.index({ recruiterId: 1, status: 1, endsAt: 1 });

if (mongoose.models.RecruitmentCampaign) {
  delete mongoose.models.RecruitmentCampaign;
}

const RecruitmentCampaign: Model<IRecruitmentCampaign> =
  mongoose.model<IRecruitmentCampaign>(
    "RecruitmentCampaign",
    recruitmentCampaignSchema
  );

export default RecruitmentCampaign;
