export interface PracticeResultQuestion {
  question: string;
  answer: string;
  feedback: string;
  score: number;
}

export interface PracticeResultRatings {
  communication: number;
  knowledge: number;
  problemSolving: number;
  confidence: number;
}

export interface PracticeResultData {
  score: number;
  duration: string;
  feedback: string;
  ratings: PracticeResultRatings;
  questions: PracticeResultQuestion[];
  createdAt: string | Date;
}

export interface PracticeProjectSession {
  id: string;
  title: string;
  jobDescription?: string;
  topic?: string;
  industry?: string;
  tags: string[];
  attemptCount: number;
  highestScore: number;
  latestResult?: PracticeResultData;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSessionsResponse {
  success: boolean;
  message?: string;
  sessions: PracticeProjectSession[];
}

export interface PracticeMutationResponse {
  success: boolean;
  message?: string;
  session: PracticeProjectSession;
}

export interface PracticeCreatePayload {
  title: string;
  industry: string;
  jobDescription?: string;
  topic?: string;
}

export interface PracticeUpdatePayload {
  title?: string;
  jobDescription?: string;
  topic?: string;
  industry?: string;
  isCompletedRun?: boolean;
  score?: number;
  duration?: string;
  feedback?: string;
  ratings?: PracticeResultRatings;
  questions?: PracticeResultQuestion[];
}

export interface CreatePracticeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newSession: PracticeProjectSession) => void;
}

export interface ResultPracticeDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  resultData?: PracticeResultData;
}
