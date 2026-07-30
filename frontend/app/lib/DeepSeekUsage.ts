import "server-only";

import { createHash } from "node:crypto";
import mongoose from "mongoose";

import type {
  GrpcDeepSeekUsage,
} from "@/app/lib/AiBackend";
import connectDB from "@/app/lib/ConnectDB";
import AiProviderSetting from "@/app/models/AiProviderSetting";
import AiUsageEvent from "@/app/models/AiUsageEvent";
import PracticeRun from "@/app/models/PracticeRun";
import type { AiUsageOperation } from "@/app/types/AiUsage";

export interface DeepSeekPricing {
  model: string;
  cacheHitInputUsdPerMillion: number;
  cacheMissInputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

export interface DeepSeekProviderConfig {
  pricing: DeepSeekPricing[];
  monthlyBudgetUsd: number;
  lowBalanceThresholdUsd: number;
}

export const DEFAULT_DEEPSEEK_PRICING: DeepSeekPricing[] = [
  {
    model: "deepseek-v4-flash",
    cacheHitInputUsdPerMillion: 0.0028,
    cacheMissInputUsdPerMillion: 0.14,
    outputUsdPerMillion: 0.28,
  },
  {
    model: "deepseek-v4-pro",
    cacheHitInputUsdPerMillion: 0.003625,
    cacheMissInputUsdPerMillion: 0.435,
    outputUsdPerMillion: 0.87,
  },
];

const DEFAULT_CONFIG: DeepSeekProviderConfig = {
  pricing: DEFAULT_DEEPSEEK_PRICING,
  monthlyBudgetUsd: 50,
  lowBalanceThresholdUsd: 5,
};

function safeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function safeMoney(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizePricing(
  pricing: Array<Partial<DeepSeekPricing>> | undefined
): DeepSeekPricing[] {
  if (!pricing?.length) {
    return DEFAULT_DEEPSEEK_PRICING.map((item) => ({ ...item }));
  }
  return pricing.slice(0, 10).map((item, index) => {
    const fallback =
      DEFAULT_DEEPSEEK_PRICING.find(
        (candidate) => candidate.model === item.model
      ) ||
      DEFAULT_DEEPSEEK_PRICING[index] ||
      DEFAULT_DEEPSEEK_PRICING[0];
    return {
      model:
        typeof item.model === "string" && item.model.trim()
          ? item.model.trim().slice(0, 120)
          : fallback.model,
      cacheHitInputUsdPerMillion: safeMoney(
        item.cacheHitInputUsdPerMillion,
        fallback.cacheHitInputUsdPerMillion
      ),
      cacheMissInputUsdPerMillion: safeMoney(
        item.cacheMissInputUsdPerMillion,
        fallback.cacheMissInputUsdPerMillion
      ),
      outputUsdPerMillion: safeMoney(
        item.outputUsdPerMillion,
        fallback.outputUsdPerMillion
      ),
    };
  });
}

export async function getDeepSeekProviderConfig(): Promise<DeepSeekProviderConfig> {
  await connectDB();
  let setting;
  try {
    setting = await AiProviderSetting.findOneAndUpdate(
      { provider: "deepseek" },
      {
        $setOnInsert: {
          provider: "deepseek",
          pricing: DEFAULT_CONFIG.pricing,
          monthlyBudgetUsd: DEFAULT_CONFIG.monthlyBudgetUsd,
          lowBalanceThresholdUsd: DEFAULT_CONFIG.lowBalanceThresholdUsd,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    )
      .select("pricing monthlyBudgetUsd lowBalanceThresholdUsd")
      .lean();
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }
    setting = await AiProviderSetting.findOne({ provider: "deepseek" })
      .select("pricing monthlyBudgetUsd lowBalanceThresholdUsd")
      .lean();
  }

  return {
    pricing: normalizePricing(setting?.pricing),
    monthlyBudgetUsd: safeMoney(
      setting?.monthlyBudgetUsd,
      DEFAULT_CONFIG.monthlyBudgetUsd
    ),
    lowBalanceThresholdUsd: safeMoney(
      setting?.lowBalanceThresholdUsd,
      DEFAULT_CONFIG.lowBalanceThresholdUsd
    ),
  };
}

function pricingForUsage(
  usage: GrpcDeepSeekUsage,
  config: DeepSeekProviderConfig
): DeepSeekPricing {
  const exact = config.pricing.find((item) => item.model === usage.model);
  if (exact) return exact;
  const expectedModel =
    usage.operation === "interview_evaluate"
      ? "deepseek-v4-pro"
      : "deepseek-v4-flash";
  return (
    config.pricing.find((item) => item.model === expectedModel) ||
    config.pricing[0] ||
    DEFAULT_DEEPSEEK_PRICING[0]
  );
}

export function calculateDeepSeekCost(
  usage: GrpcDeepSeekUsage,
  pricing: DeepSeekPricing
): number {
  const promptTokens = safeInteger(usage.promptTokens);
  const cacheHitTokens = Math.min(
    safeInteger(usage.cacheHitTokens),
    promptTokens
  );
  const reportedMissTokens = Math.min(
    safeInteger(usage.cacheMissTokens),
    promptTokens - cacheHitTokens
  );
  const unclassifiedInputTokens = Math.max(
    0,
    promptTokens - cacheHitTokens - reportedMissTokens
  );
  const cacheMissTokens = reportedMissTokens + unclassifiedInputTokens;
  const cost =
    (cacheHitTokens * pricing.cacheHitInputUsdPerMillion +
      cacheMissTokens * pricing.cacheMissInputUsdPerMillion +
      safeInteger(usage.completionTokens) * pricing.outputUsdPerMillion) /
    1_000_000;
  return Number(cost.toFixed(12));
}

interface RecordDeepSeekUsageInput {
  eventKey: string;
  userId: string;
  sessionId: string;
  practiceRunId: string;
  aiRunId?: string;
  operation: AiUsageOperation;
  status: "SUCCESS" | "FAILED";
  usage: GrpcDeepSeekUsage;
  errorCode?: string;
  errorMessage?: string;
}

export async function recordDeepSeekUsage(
  input: RecordDeepSeekUsageInput
): Promise<"recorded" | "duplicate" | "invalid"> {
  if (
    !input.eventKey ||
    !mongoose.isValidObjectId(input.userId) ||
    !mongoose.isValidObjectId(input.sessionId) ||
    !mongoose.isValidObjectId(input.practiceRunId)
  ) {
    return "invalid";
  }
  await connectDB();
  const config = await getDeepSeekProviderConfig();
  const pricing = pricingForUsage(input.usage, config);
  const promptTokens = safeInteger(input.usage.promptTokens);
  const completionTokens = safeInteger(input.usage.completionTokens);
  const totalTokens =
    safeInteger(input.usage.totalTokens) || promptTokens + completionTokens;
  const model = (input.usage.model || pricing.model).slice(0, 120);
  const estimatedCostUsd = calculateDeepSeekCost(input.usage, pricing);
  const eventKey = createHash("sha256")
    .update(input.eventKey)
    .digest("hex");

  const dbSession = await mongoose.startSession();
  let outcome: "recorded" | "duplicate" = "duplicate";
  try {
    await dbSession.withTransaction(async () => {
      const result = await AiUsageEvent.updateOne(
        { eventKey },
        {
          $setOnInsert: {
            eventKey,
            provider: "deepseek",
            userId: input.userId,
            sessionId: input.sessionId,
            practiceRunId: input.practiceRunId,
            aiRunId: (input.aiRunId || "").slice(0, 160),
            operation: input.operation,
            status: input.status,
            model,
            requestCount: safeInteger(input.usage.requestCount),
            successfulRequestCount: safeInteger(
              input.usage.successfulRequestCount
            ),
            failedRequestCount: safeInteger(input.usage.failedRequestCount),
            promptTokens,
            completionTokens,
            totalTokens,
            cacheHitTokens: Math.min(
              safeInteger(input.usage.cacheHitTokens),
              promptTokens
            ),
            cacheMissTokens: Math.min(
              safeInteger(input.usage.cacheMissTokens),
              promptTokens
            ),
            reasoningTokens: safeInteger(input.usage.reasoningTokens),
            latencyMs: safeInteger(input.usage.latencyMs),
            estimatedCostUsd,
            pricingSnapshot: {
              cacheHitInputUsdPerMillion:
                pricing.cacheHitInputUsdPerMillion,
              cacheMissInputUsdPerMillion:
                pricing.cacheMissInputUsdPerMillion,
              outputUsdPerMillion: pricing.outputUsdPerMillion,
            },
            providerRequestIds: (input.usage.requestIds || [])
              .slice(0, 10)
              .map((item) => item.slice(0, 200)),
            errorCode: (input.errorCode || "").slice(0, 80),
            errorMessage: (input.errorMessage || "").slice(0, 500),
          },
        },
        { upsert: true, setDefaultsOnInsert: true, session: dbSession }
      );
      if (result.upsertedCount !== 1) {
        outcome = "duplicate";
        return;
      }
      const runUpdate = await PracticeRun.updateOne(
        { _id: input.practiceRunId, userId: input.userId },
        {
          $inc: {
            "tokenUsage.inputTokens": promptTokens,
            "tokenUsage.outputTokens": completionTokens,
            "tokenUsage.totalTokens": totalTokens,
            "tokenUsage.cacheHitTokens": safeInteger(
              input.usage.cacheHitTokens
            ),
            "tokenUsage.cacheMissTokens": safeInteger(
              input.usage.cacheMissTokens
            ),
            "tokenUsage.reasoningTokens": safeInteger(
              input.usage.reasoningTokens
            ),
            "tokenUsage.requestCount": safeInteger(
              input.usage.requestCount
            ),
            "tokenUsage.latencyMs": safeInteger(input.usage.latencyMs),
            "tokenUsage.estimatedCostUsd": estimatedCostUsd,
          },
          $set: { "tokenUsage.model": model },
          $addToSet: { "tokenUsage.models": model },
        },
        { session: dbSession }
      );
      if (runUpdate.matchedCount !== 1) {
        throw new Error("AI_USAGE_RUN_NOT_FOUND");
      }
      outcome = "recorded";
    });
    return outcome;
  } finally {
    await dbSession.endSession();
  }
}

export async function recordDeepSeekUsageSafely(
  input: RecordDeepSeekUsageInput
): Promise<void> {
  try {
    await recordDeepSeekUsage(input);
  } catch (error) {
    console.error(
      "DeepSeek usage persistence failed:",
      error instanceof Error ? error.message.slice(0, 300) : "Unknown error"
    );
  }
}
