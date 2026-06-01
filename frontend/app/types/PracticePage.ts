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
  selectedAi: string;
  setSelectedAi: (ai: string) => void;
  isSavingSetup: boolean;
  handleStartInterview: () => void;
}

export interface ChatLog {
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
  isTypingComplete?: boolean;
}

export interface InterviewPhaseProps {
  practiceId: string;
  title: string;
  industry: string;
  difficulty: string;
  selectedAi: string;
  questionsList: string[];
  jobDescription: string;
  topic: string;
}

export interface ThreeWaveformProps {
  soundLevel: number;
  isActive: boolean;
}
