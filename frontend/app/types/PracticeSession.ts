import mongoose, { Document } from "mongoose";

export interface IPracticeSession extends Document {
  userId: mongoose.Types.ObjectId;
  source: "practice" | "recruitment";
  recruitmentCampaignId?: mongoose.Types.ObjectId;
  recruitmentInvitationId?: mongoose.Types.ObjectId;
  recruiterId?: mongoose.Types.ObjectId;
  scheduledAt?: Date;
  expiresAt?: Date;
  maxAttempts?: number;
  lockedConfig?: boolean;
  archivedAt?: Date;
  title: string;
  jobDescription?: string;
  topic?: string;
  industry?: string;
  language?: string;
  voiceId?: string;
  difficulty?: string;
  questionCount?: number;
  tags?: string[];
  attemptCount: number;
  highestScore: number;
  latestResult?: {
    score: number;
    duration: string;
    durationSec?: number;
    feedback: string;
    ratings: {
      communication: number;
      knowledge: number;
      problemSolving: number;
      confidence: number;
      jdFit?: number;
      composure?: number;
      vocalDelivery?: number;
    };
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
    groundingIds?: string[];
    questions: Array<{
      question: string;
      answer: string;
      feedback: string;
      score: number;
      evidence?: string[];
      groundingIds?: string[];
    }>;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
