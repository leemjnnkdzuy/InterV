import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { getApiRequestContext } from "@/app/lib/RequestContext";

const AI_BACKEND_GRPC_URL =
  process.env.AI_BACKEND_GRPC_URL || "localhost:50051";
const MAX_GRPC_MESSAGE_BYTES = 32 * 1024 * 1024;
const DEFAULT_GRPC_TIMEOUT_MS = 120_000;

function requireInternalKey(): string {
  const value = process.env.AI_BACKEND_INTERNAL_KEY?.trim() || "";
  if (
    Buffer.byteLength(value, "utf8") < 32 ||
    value === "dev-internal-key"
  ) {
    throw new Error(
      "AI_BACKEND_INTERNAL_KEY must be a unique secret of at least 32 bytes"
    );
  }
  return value;
}

function grpcHost(address: string): string {
  const normalized = address
    .replace(/^dns:\/\//, "")
    .replace(/^ipv4:/, "")
    .trim();
  if (normalized.startsWith("[")) {
    return normalized.slice(1, normalized.indexOf("]"));
  }
  return normalized.slice(0, normalized.lastIndexOf(":"));
}

function isLoopbackAddress(address: string): boolean {
  const host = grpcHost(address).toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function readConfiguredPem(name: string): Buffer | undefined {
  const configured = process.env[name]?.trim();
  if (!configured) return undefined;
  if (configured.includes("-----BEGIN")) {
    return Buffer.from(configured.replaceAll("\\n", "\n"), "utf8");
  }
  const decoded = Buffer.from(configured, "base64");
  if (decoded.length === 0) {
    throw new Error(`${name} must contain PEM text or base64-encoded PEM`);
  }
  return decoded;
}

function createChannelCredentials(): grpc.ChannelCredentials {
  const rootCertificate = readConfiguredPem("AI_BACKEND_GRPC_TLS_CA_PEM");
  const clientCertificate = readConfiguredPem(
    "AI_BACKEND_GRPC_TLS_CLIENT_CERT_PEM"
  );
  const clientKey = readConfiguredPem("AI_BACKEND_GRPC_TLS_CLIENT_KEY_PEM");
  if (Boolean(clientCertificate) !== Boolean(clientKey)) {
    throw new Error(
      "AI_BACKEND_GRPC_TLS_CLIENT_CERT_PEM and AI_BACKEND_GRPC_TLS_CLIENT_KEY_PEM must be configured together"
    );
  }
  if (rootCertificate) {
    return grpc.credentials.createSsl(
      rootCertificate,
      clientKey,
      clientCertificate
    );
  }
  if (!isLoopbackAddress(AI_BACKEND_GRPC_URL)) {
    throw new Error(
      "TLS is mandatory when AI_BACKEND_GRPC_URL is not loopback"
    );
  }
  return grpc.credentials.createInsecure();
}

type UnaryMethod<TRequest, TResponse> = (
  request: TRequest,
  metadata: grpc.Metadata,
  options: grpc.CallOptions,
  callback: (error: grpc.ServiceError | null, response: TResponse) => void
) => grpc.ClientUnaryCall;

interface VoiceResponse {
  id: string;
  name: string;
  locale: string;
  gender: string;
  description: string;
}

export interface GrpcQuestion {
  id: string;
  text: string;
  competency: string;
  difficulty: string;
  expectedSignals: string[];
  groundingIds: string[];
}

export interface GrpcInterviewContext {
  sessionId: string;
  title: string;
  industry: string;
  jobDescription: string;
  topic: string;
  difficulty: string;
  questionCount: number;
  language: string;
  voiceId: string;
}

export interface GrpcQaPair {
  questionId: string;
  question: string;
  answer: string;
  groundingIds: string[];
}

export interface GrpcAudioBehaviorAnalysis {
  confidence: number;
  composure: number;
  vocalDelivery: number;
  dominantEmotion: string;
  observations: string[];
  provider: string;
}

export interface GrpcAudioAnalysisChunk {
  runId: string;
  questionId: string;
  transcript: string;
  audio: Buffer;
  contentType: string;
  durationSec: number;
  finalChunk?: boolean;
}

export interface GrpcRagEvidence {
  groundingId: string;
  title: string;
  text: string;
  score: number;
  documentType: string;
  industry: string;
  level: string;
  sourceIds: string[];
  runId: string;
}

export interface GrpcDeepSeekUsage {
  operation: string;
  model: string;
  requestCount: number;
  successfulRequestCount: number;
  failedRequestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  reasoningTokens: number;
  latencyMs: number;
  requestIds: string[];
}

export interface GrpcDeepSeekBalance {
  success: boolean;
  isAvailable: boolean;
  balances: Array<{
    currency: string;
    totalBalance: string;
    grantedBalance: string;
    toppedUpBalance: string;
  }>;
  fastModel: string;
  evalModel: string;
  checkedAt: string;
}

interface IntervAiClient extends grpc.Client {
  health: UnaryMethod<
    Record<string, never>,
    {
      success: boolean;
      service: string;
      deepseekConfigured: boolean;
      assemblyaiConfigured: boolean;
      sensevoiceReady: boolean;
      transport: string;
      ragReady: boolean;
      ragBackend: string;
      ragDocumentCount: number;
    }
  >;
  extractJd: UnaryMethod<
    { content: Buffer; filename: string; contentType: string },
    {
      success: boolean;
      markdown: string;
      normalized: {
        title: string;
        company: string;
        responsibilities: string[];
        requirements: string[];
        skills: string[];
        seniority: string;
        language: string;
      };
    }
  >;
  listVoices: UnaryMethod<
    { language: string },
    { success: boolean; voices: VoiceResponse[] }
  >;
  synthesizeTts: UnaryMethod<
    { text: string; language: string; voiceId: string },
    { success: boolean; audio: Buffer; contentType: string; cached: boolean }
  >;
  startInterview: UnaryMethod<
    { context: GrpcInterviewContext },
    {
      success: boolean;
      runId: string;
      questions: GrpcQuestion[];
      provider: string;
      usage: GrpcDeepSeekUsage;
    }
  >;
  transcribeAudio: UnaryMethod<
    { audio: Buffer; filename: string; contentType: string; language: string },
    {
      success: boolean;
      transcript: string;
      language: string;
      durationSec: number;
      provider: string;
      message: string;
    }
  >;
  submitAnswer: UnaryMethod<
    {
      runId: string;
      context: GrpcInterviewContext;
      current: GrpcQaPair;
      qaHistory: GrpcQaPair[];
      nextQuestionIndex: number;
    },
    {
      success: boolean;
      feedbackHint: string;
      hasNextQuestion: boolean;
      nextQuestion?: GrpcQuestion;
      provider: string;
      usage: GrpcDeepSeekUsage;
    }
  >;
  evaluateInterview: UnaryMethod<
    {
      runId: string;
      context: GrpcInterviewContext;
      qaHistory: GrpcQaPair[];
      audioAnalysis?: GrpcAudioBehaviorAnalysis;
    },
    {
      success: boolean;
      provider: string;
      usage: GrpcDeepSeekUsage;
      evaluation: {
        score: number;
        ratings: {
          communication: number;
          knowledge: number;
          problemSolving: number;
          confidence: number;
          jdFit: number;
          composure: number;
          vocalDelivery: number;
        };
        feedback: string;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        questions: Array<{
          question: string;
          answer: string;
          score: number;
          feedback: string;
          evidence: string[];
          groundingIds: string[];
        }>;
        audioAnalysis?: GrpcAudioBehaviorAnalysis;
        groundingIds: string[];
      };
    }
  >;
  createStreamingToken: UnaryMethod<
    { expiresInSeconds: number; maxSessionDurationSeconds: number },
    {
      success: boolean;
      token: string;
      expiresInSeconds: number;
      websocketUrl: string;
      speechModel: string;
    }
  >;
  analyzeInterview: (
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (
      error: grpc.ServiceError | null,
      response: { success: boolean; analysis: GrpcAudioBehaviorAnalysis }
    ) => void
  ) => grpc.ClientWritableStream<GrpcAudioAnalysisChunk>;
  getRagStatus: UnaryMethod<
    Record<string, never>,
    {
      success: boolean;
      ready: boolean;
      backend: string;
      collection: string;
      documentCount: number;
      denseModel: string;
      sparseModel: string;
      error: string;
    }
  >;
  searchKnowledge: UnaryMethod<
    {
      query: string;
      industry: string;
      difficulty: string;
      sessionId?: string;
      runId?: string;
      purpose: "question" | "follow_up" | "evaluation" | "audit";
      limit?: number;
    },
    { success: boolean; evidence: GrpcRagEvidence[] }
  >;
  deleteKnowledge: UnaryMethod<
    { sessionId?: string; runId?: string },
    { success: boolean; deletedCount: number }
  >;
  getDeepSeekBalance: UnaryMethod<
    Record<string, never>,
    GrpcDeepSeekBalance
  >;
}

type IntervAiClientConstructor = new (
  address: string,
  credentials: grpc.ChannelCredentials,
  options?: grpc.ChannelOptions
) => IntervAiClient;

declare global {
  var intervAiGrpcClient: IntervAiClient | undefined;
}

function resolveProtoPath(): string {
  const protoPath = path.join(
    process.cwd(),
    "proto",
    "interv_ai.proto"
  );
  if (!existsSync(protoPath)) {
    throw new Error("Could not locate proto/interv_ai.proto");
  }
  return protoPath;
}

function createClient(): IntervAiClient {
  const definition = protoLoader.loadSync(resolveProtoPath(), {
    defaults: true,
    enums: String,
    longs: Number,
    oneofs: true,
  });
  const root = grpc.loadPackageDefinition(definition) as grpc.GrpcObject;
  const interv = root.interv as grpc.GrpcObject;
  const ai = interv.ai as grpc.GrpcObject;
  const v1 = ai.v1 as grpc.GrpcObject;
  const Client = v1.IntervAi as unknown as IntervAiClientConstructor;

  return new Client(
    AI_BACKEND_GRPC_URL,
    createChannelCredentials(),
    {
      "grpc.max_receive_message_length": MAX_GRPC_MESSAGE_BYTES,
      "grpc.max_send_message_length": MAX_GRPC_MESSAGE_BYTES,
      ...(process.env.AI_BACKEND_GRPC_TLS_SERVER_NAME
        ? {
            "grpc.ssl_target_name_override":
              process.env.AI_BACKEND_GRPC_TLS_SERVER_NAME,
            "grpc.default_authority":
              process.env.AI_BACKEND_GRPC_TLS_SERVER_NAME,
          }
        : {}),
    }
  );
}

function getClient(): IntervAiClient {
  if (!globalThis.intervAiGrpcClient) {
    globalThis.intervAiGrpcClient = createClient();
  }
  return globalThis.intervAiGrpcClient;
}

function getMetadata(): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set("x-internal-api-key", requireInternalKey());
  const requestId = getApiRequestContext()?.requestId;
  if (requestId) {
    metadata.set("x-request-id", requestId);
  }
  return metadata;
}

function usageFromMetadata(
  metadata: grpc.Metadata | undefined
): GrpcDeepSeekUsage | null {
  const raw = metadata?.get("x-deepseek-usage")[0];
  if (typeof raw !== "string" && !Buffer.isBuffer(raw)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      typeof raw === "string" ? raw : raw.toString("utf8")
    ) as Record<string, unknown>;
    const numberValue = (key: string) => {
      const value = Number(payload[key]);
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    };
    return {
      operation:
        typeof payload.operation === "string"
          ? payload.operation.slice(0, 80)
          : "",
      model:
        typeof payload.model === "string" ? payload.model.slice(0, 120) : "",
      requestCount: numberValue("request_count"),
      successfulRequestCount: numberValue("successful_request_count"),
      failedRequestCount: numberValue("failed_request_count"),
      promptTokens: numberValue("prompt_tokens"),
      completionTokens: numberValue("completion_tokens"),
      totalTokens: numberValue("total_tokens"),
      cacheHitTokens: numberValue("cache_hit_tokens"),
      cacheMissTokens: numberValue("cache_miss_tokens"),
      reasoningTokens: numberValue("reasoning_tokens"),
      latencyMs: numberValue("latency_ms"),
      requestIds: Array.isArray(payload.request_ids)
        ? payload.request_ids
            .filter((item): item is string => typeof item === "string")
            .slice(0, 10)
            .map((item) => item.slice(0, 200))
        : [],
    };
  } catch {
    return null;
  }
}

function unary<TRequest, TResponse>(
  method: UnaryMethod<TRequest, TResponse>,
  request: TRequest,
  timeoutMs = DEFAULT_GRPC_TIMEOUT_MS
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    method.call(
      getClient(),
      request,
      getMetadata(),
      { deadline: Date.now() + timeoutMs },
      (error, response) => {
        if (error) {
          reject(
            new AiBackendError(
              error.details || error.message,
              error.code,
              usageFromMetadata(error.metadata)
            )
          );
          return;
        }
        resolve(response);
      }
    );
  });
}

export class AiBackendError extends Error {
  status: number;
  usage: GrpcDeepSeekUsage | null;

  constructor(
    message: string,
    status: number,
    usage: GrpcDeepSeekUsage | null = null
  ) {
    super(message);
    this.name = "AiBackendError";
    this.status = status;
    this.usage = usage;
  }
}

export const aiBackend = {
  health: () => unary(getClient().health, {}, 120_000),

  extractJd: (request: {
    content: Buffer;
    filename: string;
    contentType: string;
  }) => unary(getClient().extractJd, request, 180_000),

  listVoices: (language: string) =>
    unary(getClient().listVoices, { language }, 30_000),

  synthesizeTts: (request: {
    text: string;
    language: string;
    voiceId: string;
  }) => unary(getClient().synthesizeTts, request, 60_000),

  startInterview: (context: GrpcInterviewContext) =>
    unary(getClient().startInterview, { context }, 300_000),

  transcribeAudio: (request: {
    audio: Buffer;
    filename: string;
    contentType: string;
    language: string;
  }) => unary(getClient().transcribeAudio, request, 300_000),

  submitAnswer: (request: {
    runId: string;
    context: GrpcInterviewContext;
    current: GrpcQaPair;
    qaHistory: GrpcQaPair[];
    nextQuestionIndex: number;
  }) => unary(getClient().submitAnswer, request),

  evaluateInterview: (request: {
    runId: string;
    context: GrpcInterviewContext;
    qaHistory: GrpcQaPair[];
    audioAnalysis?: GrpcAudioBehaviorAnalysis;
  }) => unary(getClient().evaluateInterview, request, 300_000),

  createStreamingToken: (request: {
    expiresInSeconds: number;
    maxSessionDurationSeconds: number;
  }) => unary(getClient().createStreamingToken, request, 15_000),

  analyzeInterview: (
    chunks: GrpcAudioAnalysisChunk[]
  ): Promise<{ success: boolean; analysis: GrpcAudioBehaviorAnalysis }> =>
    new Promise((resolve, reject) => {
      const call = getClient().analyzeInterview(
        getMetadata(),
        { deadline: Date.now() + 600_000 },
        (error, response) => {
          if (error) {
            reject(new AiBackendError(error.details || error.message, error.code));
            return;
          }
          resolve(response);
        }
      );

      for (const chunk of chunks) {
        call.write(chunk);
      }
      call.end();
    }),

  getRagStatus: () => unary(getClient().getRagStatus, {}, 120_000),

  searchKnowledge: (request: {
    query: string;
    industry: string;
    difficulty: string;
    sessionId?: string;
    runId?: string;
    purpose: "question" | "follow_up" | "evaluation" | "audit";
    limit?: number;
  }) => unary(getClient().searchKnowledge, request, 120_000),

  deleteKnowledge: (request: { sessionId?: string; runId?: string }) =>
    unary(getClient().deleteKnowledge, request, 120_000),

  getDeepSeekBalance: () =>
    unary(getClient().getDeepSeekBalance, {}, 30_000),
};
