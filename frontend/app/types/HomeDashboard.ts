export interface HomeDashboardSession {
  id: string;
  sessionId: string;
  position: string;
  date: string;
  duration: string;
  durationSec: number;
  score: number;
  status: "completed";
}

export interface HomeDashboardResponse {
  success: boolean;
  message?: string;
  stats: {
    totalInterviews: number;
    averageScore: number;
    totalDurationSec: number;
  };
  recentSessions: HomeDashboardSession[];
}
