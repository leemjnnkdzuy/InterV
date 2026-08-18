export interface PracticeResultQuestion {
  question: string;
  answer: string;
  feedback: string;
  score: number;
  evidence?: string[];
}

export interface PracticeResultRatings {
  communication: number;
  knowledge: number;
  problemSolving: number;
  confidence: number;
  jdFit?: number;
  composure?: number;
  vocalDelivery?: number;
}

export interface PracticeResultData {
  score: number;
  duration: string;
  durationSec?: number;
  feedback: string;
  ratings: PracticeResultRatings;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  audioAnalysis?: {
    confidence: number;
    composure: number;
    vocalDelivery: number;
    dominantEmotion: string;
    observations: string[];
    recommendations?: string[];
    speakingRateWpm?: number;
    paceConsistency?: number;
    pauseRatio?: number;
    volumeStability?: number;
    fillerWordCount?: number;
    averageAnswerDurationSec?: number;
    analyzedAnswerCount?: number;
    totalWordCount?: number;
    provider: string;
  };
  provider?: string;
  questions: PracticeResultQuestion[];
  createdAt: string | Date;
}

export interface PracticeProjectSession {
  id: string;
  title: string;
  jobDescription?: string;
  jobDescriptionSource?: "upload" | "paste";
  topic?: string;
  industry?: string;
  language?: string;
  voiceId?: string;
  difficulty?: string;
  questionCount?: number;
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
  jobDescriptionSource?: "upload" | "paste";
  topic?: string;
  industry?: string;
  language?: string;
  voiceId?: string;
  difficulty?: string;
  questionCount?: number;
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
