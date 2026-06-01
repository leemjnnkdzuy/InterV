import mongoose, { Document } from "mongoose";

export interface IPracticeSession extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  jobDescription?: string;
  topic?: string;
  industry?: string;
  tags?: string[];
  attemptCount: number;
  highestScore: number;
  latestResult?: {
    score: number;
    duration: string;
    feedback: string;
    ratings: {
      communication: number;
      knowledge: number;
      problemSolving: number;
      confidence: number;
    };
    questions: Array<{
      question: string;
      answer: string;
      feedback: string;
      score: number;
    }>;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
