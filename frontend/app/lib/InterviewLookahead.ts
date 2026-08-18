import "server-only";

import {
  AiBackendError,
  aiBackend,
  type GrpcInterviewContext,
  type GrpcQaPair,
} from "@/app/lib/AiBackend";
import { recordDeepSeekUsageSafely } from "@/app/lib/DeepSeekUsage";
import PracticeRun from "@/app/models/PracticeRun";

interface LookaheadInput {
  runId: string;
  userId: string;
  aiRunId: string;
  context: GrpcInterviewContext;
  current: GrpcQaPair;
  qaHistory: GrpcQaPair[];
  targetQuestionIndex: number;
}

export async function generateInterviewLookahead({
  runId,
  userId,
  aiRunId,
  context,
  current,
  qaHistory,
  targetQuestionIndex,
}: LookaheadInput): Promise<void> {
  const eventKey = `interview-follow-up:${runId}:${current.questionId}:${targetQuestionIndex}`;
  try {
    const response = await aiBackend.submitAnswer({
      runId: aiRunId,
      context,
      current,
      qaHistory,
      nextQuestionIndex: targetQuestionIndex,
    });
    if (response.usage) {
      await recordDeepSeekUsageSafely({
        eventKey,
        userId,
        sessionId: context.sessionId,
        practiceRunId: runId,
        aiRunId,
        operation: "interview_follow_up",
        status: "SUCCESS",
        usage: response.usage,
      });
    }
    if (!response.hasNextQuestion || !response.nextQuestion?.text) {
      return;
    }

    const questionId =
      response.nextQuestion.id || `q_${targetQuestionIndex + 1}`;
    const question = {
      id: questionId,
      text: response.nextQuestion.text,
      ttsText:
        response.nextQuestion.ttsText || response.nextQuestion.text,
      acknowledgementText: response.acknowledgementText || "",
      transitionText: response.transitionText || "",
      spokenText:
        response.spokenText ||
        response.nextQuestion.ttsText ||
        response.nextQuestion.text,
      transitionType: response.transitionType || "",
      competency: response.nextQuestion.competency || "general",
      difficulty:
        response.nextQuestion.difficulty || context.difficulty || "Middle",
      expectedSignals: response.nextQuestion.expectedSignals || [],
      groundingIds: response.nextQuestion.groundingIds || [],
    };
    const updated = await PracticeRun.updateOne(
      {
        _id: runId,
        userId,
        status: "IN_PROGRESS",
        servedQuestionIds: { $ne: questionId },
        [`questions.${targetQuestionIndex}.id`]: questionId,
      },
      { $set: { [`questions.${targetQuestionIndex}`]: question } }
    );
    if (updated.modifiedCount === 1) {
      await aiBackend.synthesizeTts({
        text: question.spokenText,
        language: context.language,
        voiceId: context.voiceId,
      });
    }
  } catch (error) {
    if (error instanceof AiBackendError && error.usage) {
      await recordDeepSeekUsageSafely({
        eventKey,
        userId,
        sessionId: context.sessionId,
        practiceRunId: runId,
        aiRunId,
        operation: "interview_follow_up",
        status: "FAILED",
        usage: error.usage,
        errorCode: String(error.status),
        errorMessage: error.message,
      });
    }
    console.error("Interview lookahead generation failed:", error);
  }
}
