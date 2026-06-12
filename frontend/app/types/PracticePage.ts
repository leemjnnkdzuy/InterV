export interface PracticeRouter {
  push: (href: string) => void;
}

export interface PracticePageProps {
  practiceId: string;
}

export interface PracticeSessionDetails {
  id?: string;
  title?: string;
  jobDescription?: string;
  topic?: string;
  industry?: string;
  language?: string;
  voiceId?: string;
  difficulty?: string;
  questionCount?: number;
}

export interface PracticeSessionResponse {
  success: boolean;
  message?: string;
  session?: PracticeSessionDetails;
}

export interface SetupPhaseProps {
  router: PracticeRouter;
  practiceId: string;
  title: string;
  setTitle: (t: string) => void;
  industry: string;
  setIndustry: (i: string) => void;
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  topic: string;
  setTopic: (tp: string) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
  duration: number;
  setDuration: (du: number) => void;
  language: string;
  setLanguage: (language: string) => void;
  voiceId: string;
  setVoiceId: (voiceId: string) => void;
  isSavingSetup: boolean;
  handleStartInterview: (options: PracticeStartOptions) => void;
}

export interface PracticeStartOptions {
  language: string;
  voiceId: string;
  hasUploadedJdFile: boolean;
}

export interface InterviewVoice {
  id: string;
  name: string;
  locale: string;
  gender?: string;
  description?: string;
}

export interface GeneratedInterviewQuestion {
  id: string;
  text: string;
  competency: string;
  difficulty?: string;
  expectedSignals?: string[];
}

export interface PracticeQuoteBreakdownItem {
  key?: "aiQuestions" | "jdUpload";
  label: string;
  credits: number;
}

export interface PracticeQuoteData {
  totalCredits: number;
  vndEquivalent: number;
  balanceCredits: number;
  remainingCredits: number;
  canAfford: boolean;
  breakdown: PracticeQuoteBreakdownItem[];
}

export interface PracticeQuotePayload {
  difficulty: string;
  duration: number;
  language: string;
  voiceId: string;
  hasUploadedJdFile: boolean;
}

export interface PracticeStartPayload extends PracticeQuotePayload {
  title: string;
  industry: string;
  jobDescription: string;
  topic: string;
  idempotencyKey: string;
}

export interface PracticeStartResponse {
  success: boolean;
  message?: string;
  runId?: string;
  questions?: GeneratedInterviewQuestion[];
  quote?: {
    totalCredits: number;
    remainingCredits: number;
  };
}

export interface ChatLog {
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
  isTypingComplete?: boolean;
}

export interface InterviewPhaseProps {
  practiceId: string;
  runId: string;
  title: string;
  industry: string;
  difficulty: string;
  language: string;
  voiceId: string;
  questionsList: string[];
  jobDescription: string;
  topic: string;
}

export interface ThreeWaveformProps {
  soundLevel: number;
  isActive: boolean;
}
