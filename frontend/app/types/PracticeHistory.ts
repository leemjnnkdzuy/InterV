export type PracticeHistorySource = "practice" | "recruitment";

export type PracticeHistoryStatus =
  | "STARTED"
  | "IN_PROGRESS"
  | "EVALUATING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";

export interface PracticeHistoryItem {
  id: string;
  sessionId: string;
  source: PracticeHistorySource;
  title: string;
  industry: string;
  difficulty: string;
  status: PracticeHistoryStatus;
  score?: number;
  duration: string;
  durationSec: number;
  answeredCount: number;
  questionCount: number;
  startedAt: string;
  completedAt?: string;
  recruiterName?: string;
  campaignTitle?: string;
  jobTitle?: string;
}

export interface PracticeHistoryResponse {
  success: boolean;
  message?: string;
  items: PracticeHistoryItem[];
  stats: {
    total: number;
    practice: number;
    recruitment: number;
    completed: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
