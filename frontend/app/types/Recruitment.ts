import type { Document, Types } from "mongoose";

export type RecruitmentCampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "CLOSED"
  | "ARCHIVED";

export type RecruitmentInvitationStatus =
  | "INVITED"
  | "VIEWED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export type RecruitmentEmailStatus =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "FAILED";

export interface IRecruitmentCampaign extends Document {
  recruiterId: Types.ObjectId;
  title: string;
  jobTitle: string;
  department?: string;
  industry: string;
  employmentType: string;
  workMode: string;
  location?: string;
  jobDescription: string;
  topic?: string;
  language: string;
  voiceId: string;
  difficulty: string;
  questionCount: number;
  maxAttempts: number;
  startsAt?: Date;
  endsAt: Date;
  invitationMessage?: string;
  status: RecruitmentCampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecruitmentInvitation extends Document {
  campaignId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  candidateId: Types.ObjectId;
  practiceSessionId: Types.ObjectId;
  candidateEmail: string;
  status: RecruitmentInvitationStatus;
  emailStatus: RecruitmentEmailStatus;
  emailAttempts: number;
  emailLastError?: string;
  emailLeaseExpiresAt?: Date;
  invitedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  lastRunId?: Types.ObjectId;
  finalScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminAuditLog extends Document {
  actorId: Types.ObjectId;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
