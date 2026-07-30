import type {
  RecruitmentCampaignStatus,
  RecruitmentInvitationStatus,
} from "./Recruitment";

export interface UserInterviewItem {
  id: string;
  practiceSessionId: string;
  status: RecruitmentInvitationStatus;
  invitedAt: string;
  viewedAt?: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt: string;
  finalScore?: number;
  lastRunId?: string;
  attemptCount: number;
  maxAttempts: number;
  highestScore: number;
  recruiter: {
    id: string;
    username: string;
    avatar: string;
  } | null;
  campaign: {
    id: string;
    title: string;
    jobTitle: string;
    department: string;
    industry: string;
    employmentType: string;
    workMode: string;
    location: string;
    language: string;
    difficulty: string;
    questionCount: number;
    startsAt?: string;
    endsAt: string;
    invitationMessage: string;
    status: RecruitmentCampaignStatus;
  } | null;
}

export interface UserInterviewsResponse {
  success: boolean;
  message?: string;
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  interviews: UserInterviewItem[];
}
