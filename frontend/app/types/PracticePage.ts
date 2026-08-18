import type { CandidateIntroItem } from "./PracticeRun";

export type PracticeJobDescriptionSource = "upload" | "paste";

export interface PracticeRouter {
  push: (href: string) => void;
}

export interface PracticePageProps {
  practiceId: string;
}

export interface PracticeSessionDetails {
  id?: string;
  source?: "practice" | "recruitment";
  lockedConfig?: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  maxAttempts?: number;
  title?: string;
  jobDescription?: string;
  jobDescriptionSource?: PracticeJobDescriptionSource;
  topic?: string;
  industry?: string;
  language?: string;
  voiceId?: string;
  autoTurnTaking?: boolean;
  textAnswerEnabled?: boolean;
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
  jobDescriptionSource?: PracticeJobDescriptionSource;
  setJobDescriptionSource: (source: PracticeJobDescriptionSource) => void;
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
  autoTurnTaking: boolean;
  setAutoTurnTaking: (enabled: boolean) => void;
  textAnswerEnabled: boolean;
  setTextAnswerEnabled: (enabled: boolean) => void;
  isSavingSetup: boolean;
  recruitmentMode?: boolean;
  recruitmentExpiresAt?: string;
  handleStartInterview: (options: PracticeStartOptions) => void;
}

export interface PracticeStartOptions {
  language: string;
  voiceId: string;
  voiceName: string;
  openingPrompt: string;
  hasUploadedJdFile: boolean;
  autoTurnTaking: boolean;
  textAnswerEnabled: boolean;
  jobDescriptionSource: PracticeJobDescriptionSource;
}

export interface InterviewVoice {
  id: string;
  name: string;
  locale: string;
  gender?: string;
  description?: string;
  demoUrl?: string;
}

export interface GeneratedInterviewQuestion {
  id: string;
  text: string;
  ttsText?: string;
  acknowledgementText?: string;
  transitionText?: string;
  spokenText?: string;
  transitionType?:
    | "opening_to_first"
    | "continue_competency"
    | "probe_gap"
    | "bridge_to_next_competency";
  competency: string;
  difficulty?: string;
  expectedSignals?: string[];
  groundingIds?: string[];
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
  openingPrompt: string;
  voiceName?: string;
  idempotencyKey: string;
  autoTurnTaking: boolean;
  textAnswerEnabled: boolean;
  jobDescriptionSource: PracticeJobDescriptionSource;
}

export interface PracticeStartResponse {
  success: boolean;
  message?: string;
  runId?: string;
  questions?: GeneratedInterviewQuestion[];
  questionCount?: number;
  language?: string;
  voiceId?: string;
  openingAudio?: InterviewQuestionAudio;
  firstQuestionAudio?: InterviewQuestionAudio;
  quote?: {
    totalCredits: number;
    remainingCredits?: number;
  };
}

export interface InterviewQuestionAudio {
  audioBase64: string;
  contentType: string;
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
  initialOpeningAudio?: InterviewQuestionAudio;
  questionsList: GeneratedInterviewQuestion[];
  initialQuestionAudio?: InterviewQuestionAudio;
  questionCount: number;
  jobDescription: string;
  topic: string;
  voiceName?: string;
  autoTurnTaking: boolean;
  textAnswerEnabled: boolean;
}

export interface PracticeOpeningPayload {
  prompt: string;
  transcript: string;
  durationSec?: number;
  assemblySessionId?: string;
  transcriptionProvider: string;
}

export interface PracticeOpeningResponse {
  success: boolean;
  message?: string;
  alreadySaved?: boolean;
  nextQuestion?: GeneratedInterviewQuestion | null;
  nextQuestionAudio?: InterviewQuestionAudio;
  acknowledgementText?: string;
  transitionText?: string;
  spokenText?: string;
  transitionType?: GeneratedInterviewQuestion["transitionType"];
}

export interface InterviewAnswerResponse {
  success: boolean;
  message?: string;
  completed: boolean;
  answeredCount: number;
  questionCount: number;
  nextQuestion: GeneratedInterviewQuestion | null;
  acknowledgementText?: string;
  transitionText?: string;
  spokenText?: string;
  transitionType?: GeneratedInterviewQuestion["transitionType"];
  provider?: string;
}

export interface InterviewAnalysisResult {
  score: number;
  duration: string;
  feedback: string;
  candidateIntro?: {
    prompt: string;
    transcript: string;
    audioDurationSec?: number;
    transcriptionProvider?: string;
  };
  candidateIntroItems?: CandidateIntroItem[];
  ratings: {
    communication: number;
    knowledge: number;
    problemSolving: number;
    confidence: number;
    jdFit: number;
    composure: number;
    vocalDelivery: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
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
  questions: Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number;
    evidence?: string[];
    groundingIds?: string[];
  }>;
  groundingIds?: string[];
  provider?: string;
  createdAt: string;
}

export interface InterviewResultResponse {
  success: boolean;
  message?: string;
  run?: {
    id: string;
    practiceId: string;
    title: string;
    industry: string;
    difficulty: string;
    status: string;
    answeredCount: number;
    questionCount: number;
    candidateIntro?: {
      prompt: string;
      transcript: string;
      audioDurationSec?: number;
      transcriptionProvider?: string;
    };
    candidateIntroItems?: CandidateIntroItem[];
    result: InterviewAnalysisResult;
    completedAt: string;
  };
}

export interface ThreeWaveformProps {
  soundLevel: number;
  isActive: boolean;
}
