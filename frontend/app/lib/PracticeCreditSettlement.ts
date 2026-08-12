import "server-only";

import mongoose from "mongoose";

import CreditLog from "@/app/models/CreditLog";
import PracticeRun from "@/app/models/PracticeRun";
import User from "@/app/models/User";
import { publishCreditUpdated } from "@/app/lib/CreditEvents";

interface ChargePracticeInput {
  runId: string;
  userId: string;
  credits: number;
  description: string;
  metadata: Record<string, unknown>;
}

interface CreditSettlementResult {
  outcome: "settled" | "already-settled" | "insufficient";
  remainingCredits: number;
}

const TRANSACTION_OPTIONS = {
  readPreference: "primary" as const,
  readConcern: { level: "snapshot" as const },
  writeConcern: { w: "majority" as const },
  maxCommitTimeMS: 10_000,
};

export async function chargePracticeRun({
  runId,
  userId,
  credits,
  description,
  metadata,
}: ChargePracticeInput): Promise<CreditSettlementResult> {
  const dbSession = await mongoose.startSession();
  let result: CreditSettlementResult = {
    outcome: "insufficient",
    remainingCredits: 0,
  };
  try {
    await dbSession.withTransaction(async () => {
      const run = await PracticeRun.findOne({
        _id: runId,
        userId,
      }).session(dbSession);
      if (!run) {
        throw new Error("Practice run does not exist");
      }

      if ((run.creditUsage?.chargedCredits || 0) >= credits) {
        const user = await User.findById(userId)
          .select("credits")
          .session(dbSession)
          .lean();
        result = {
          outcome: "already-settled",
          remainingCredits: user?.credits || 0,
        };
        return;
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          isActive: true,
          credits: { $gte: credits },
        },
        { $inc: { credits: -credits } },
        { returnDocument: "after", session: dbSession }
      ).select("credits");
      if (!user) {
        run.status = "FAILED";
        await run.save({ session: dbSession });
        result = { outcome: "insufficient", remainingCredits: 0 };
        return;
      }

      run.creditUsage.chargedCredits = credits;
      await run.save({ session: dbSession });
      await CreditLog.create(
        [
          {
            userId,
            credits: -credits,
            action: "AI_INTERVIEW",
            referenceId: runId,
            description,
            metadata,
          },
        ],
        { session: dbSession }
      );
      result = {
        outcome: "settled",
        remainingCredits: user.credits,
      };
    }, TRANSACTION_OPTIONS);
    if (result.outcome === "settled") {
      publishCreditUpdated({
        userId,
        balance: result.remainingCredits,
        delta: -credits,
        reason: "AI_INTERVIEW",
        referenceId: runId,
      });
    }
    return result;
  } finally {
    await dbSession.endSession();
  }
}

export async function refundPracticeRun(
  runId: string,
  userId: string,
  description: string,
  expectedStartLeaseId?: string
): Promise<CreditSettlementResult> {
  const dbSession = await mongoose.startSession();
  let result: CreditSettlementResult = {
    outcome: "already-settled",
    remainingCredits: 0,
  };
  let creditDelta = 0;
  try {
    await dbSession.withTransaction(async () => {
      const run = await PracticeRun.findOne({
        _id: runId,
        userId,
        ...(expectedStartLeaseId
          ? {
              status: "STARTED",
              startLeaseId: expectedStartLeaseId,
            }
          : {}),
      }).session(dbSession);
      if (!run) {
        if (!expectedStartLeaseId) {
          throw new Error("Practice run does not exist");
        }
        const user = await User.findById(userId)
          .select("credits")
          .session(dbSession)
          .lean();
        result = {
          outcome: "already-settled",
          remainingCredits: user?.credits || 0,
        };
        return;
      }

      const charged = run.creditUsage?.chargedCredits || 0;
      const refunded = run.creditUsage?.refundedCredits || 0;
      const refundCredits = Math.max(0, charged - refunded);
      if (refundCredits === 0) {
        const user = await User.findById(userId)
          .select("credits")
          .session(dbSession)
          .lean();
        result = {
          outcome: "already-settled",
          remainingCredits: user?.credits || 0,
        };
        return;
      }

      const user = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { credits: refundCredits } },
        { returnDocument: "after", session: dbSession }
      ).select("credits");
      if (!user) {
        throw new Error("Practice owner does not exist");
      }

      run.status = "REFUNDED";
      run.creditUsage.refundedCredits = charged;
      await run.save({ session: dbSession });
      await CreditLog.create(
        [
          {
            userId,
            credits: refundCredits,
            action: "AI_INTERVIEW_REFUND",
            referenceId: runId,
            description,
          },
        ],
        { session: dbSession }
      );
      result = {
        outcome: "settled",
        remainingCredits: user.credits,
      };
      creditDelta = refundCredits;
    }, TRANSACTION_OPTIONS);
    if (result.outcome === "settled") {
      publishCreditUpdated({
        userId,
        balance: result.remainingCredits,
        delta: creditDelta,
        reason: "AI_INTERVIEW_REFUND",
        referenceId: runId,
      });
    }
    return result;
  } finally {
    await dbSession.endSession();
  }
}
