import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE_URL =
  process.env.E2E_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";
const ORIGIN = new URL(BASE_URL).origin;
const TEST_PREFIX = `e2e_${Date.now().toString(36)}_${randomUUID()
  .replaceAll("-", "")
  .slice(0, 6)}`;
const TEST_PASSWORD = `InterV-E2E-${randomUUID()}!`;
const modeArgument = process.argv
  .find((argument) => argument.startsWith("--mode="))
  ?.slice("--mode=".length);
const E2E_MODE =
  (modeArgument || process.env.E2E_MODE) === "recruitment"
    ? "recruitment"
    : "practice";
const IS_RECRUITMENT = E2E_MODE === "recruitment";
const CANDIDATE_EMAIL = `${TEST_PREFIX}@example.invalid`;
const RECRUITER_USERNAME = `${TEST_PREFIX}_rec`;
const RECRUITER_EMAIL = `${TEST_PREFIX}_recruiter@example.invalid`;
const cookieJar = new Map();

let db;
let userId;
let recruiterId;
let practiceId = "";
let runId = "";
let campaignId = "";
let invitationId = "";
let tempDirectory = "";
let grpcClient;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function updateCookies(headers) {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";", 1);
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (value) cookieJar.set(name, value);
    else cookieJar.delete(name);
  }
}

function requestHeaders(json = false) {
  const headers = {
    Origin: ORIGIN,
    "Sec-Fetch-Site": "same-origin",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (json) headers["Content-Type"] = "application/json";
  if (cookieJar.size > 0) {
    headers.Cookie = [...cookieJar]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
  return headers;
}

async function api(pathname, options = {}) {
  const isJson =
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    typeof options.body !== "string";
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      ...requestHeaders(isJson),
      ...(options.headers || {}),
    },
    body: isJson ? JSON.stringify(options.body) : options.body,
    signal: options.signal || AbortSignal.timeout(620_000),
  });
  updateCookies(response.headers);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { status: response.status, data };
}

async function loginAs(identifier) {
  cookieJar.clear();
  const login = await api("/api/auth/login", {
    method: "POST",
    body: {
      identifier,
      password: TEST_PASSWORD,
      rememberMe: false,
    },
  });
  assert(
    login.status === 200 && login.data.success,
    `Login failed for ${identifier}: status=${login.status} message=${String(
      login.data?.message || "unknown"
    ).slice(0, 160)}`
  );
  assert(cookieJar.has("access_token"), "Access cookie was not issued");
  assert(cookieJar.has("refresh_token"), "Refresh cookie was not issued");
}

async function setupMongoFixture() {
  const uri = process.env.MONGODB_URI?.trim();
  assert(uri, "MONGODB_URI is required");
  await mongoose.connect(uri);
  db = mongoose.connection.db;
  assert(db, "MongoDB connection is unavailable");

  userId = new mongoose.Types.ObjectId();
  if (IS_RECRUITMENT) {
    recruiterId = new mongoose.Types.ObjectId();
  }
  const now = new Date();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const testUsers = [
    {
      _id: userId,
      username: TEST_PREFIX,
      email: CANDIDATE_EMAIL,
      password: passwordHash,
      role: "user",
      avatar: "",
      socialLinks: [],
      isVerified: true,
      isActive: true,
      credits: 1000,
      createdAt: now,
      updatedAt: now,
    },
  ];
  if (IS_RECRUITMENT) {
    testUsers.push({
      _id: recruiterId,
      username: RECRUITER_USERNAME,
      email: RECRUITER_EMAIL,
      password: passwordHash,
      role: "recruiter",
      avatar: "",
      socialLinks: [],
      isVerified: true,
      isActive: true,
      credits: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("users").insertMany(testUsers);
}

function createGrpcClient() {
  const protoPath = path.resolve(
    process.cwd(),
    "proto",
    "interv_ai.proto"
  );
  const definition = protoLoader.loadSync(protoPath, {
    defaults: true,
    enums: String,
    longs: String,
    oneofs: true,
  });
  const root = grpc.loadPackageDefinition(definition);
  const Client = root.interv.ai.v1.IntervAi;
  grpcClient = new Client(
    process.env.AI_BACKEND_GRPC_URL || "localhost:50051",
    grpc.credentials.createInsecure()
  );
}

async function deleteKnowledge() {
  if (!grpcClient || (!practiceId && !runId)) return;
  const key = process.env.AI_BACKEND_INTERNAL_KEY?.trim();
  if (!key) return;
  const metadata = new grpc.Metadata();
  metadata.set("x-internal-api-key", key);
  await new Promise((resolve, reject) => {
    grpcClient.DeleteKnowledge(
      {
        sessionId: practiceId,
        runId,
      },
      metadata,
      { deadline: Date.now() + 30_000 },
      (error) => (error ? reject(error) : resolve())
    );
  });
}

async function cleanup() {
  if (!IS_RECRUITMENT && practiceId && cookieJar.size > 0) {
    await api(`/api/practice/${practiceId}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }
  await deleteKnowledge().catch(() => undefined);

  if (db && userId) {
    const userFilter = { userId };
    const fixtureUserIds = [userId, recruiterId].filter(Boolean);
    const testSessions = await db
      .collection("sessions")
      .find(
        { userId: { $in: fixtureUserIds } },
        { projection: { ipAddress: 1 } }
      )
      .toArray();
    await Promise.all([
      db.collection("practiceaudios").deleteMany(userFilter),
      db.collection("practiceruns").deleteMany(userFilter),
      db.collection("practicesessions").deleteMany(userFilter),
      db.collection("creditlogs").deleteMany(userFilter),
      db.collection("transactions").deleteMany(userFilter),
      db.collection("aiusageevents").deleteMany(userFilter),
      db
        .collection("sessions")
        .deleteMany({ userId: { $in: fixtureUserIds } }),
      db.collection("emailchangepins").deleteMany(userFilter),
      db.collection("recruitmentinvitations").deleteMany({
        $or: [
          { candidateId: userId },
          ...(recruiterId ? [{ recruiterId }] : []),
        ],
      }),
      ...(recruiterId
        ? [
            db
              .collection("recruitmentcampaigns")
              .deleteMany({ recruiterId }),
            db
              .collection("adminauditlogs")
              .deleteMany({ actorId: recruiterId }),
          ]
        : []),
      db.collection("users").deleteMany({ _id: { $in: fixtureUserIds } }),
    ]);
    const rateLimitIdentities = [
      ["login:account", TEST_PREFIX],
      ["ai-stream-token", `${userId.toString()}:${runId}`],
    ];
    if (IS_RECRUITMENT && recruiterId) {
      rateLimitIdentities.push(
        ["login:account", RECRUITER_USERNAME],
        ["recruiter:create-campaign", recruiterId.toString()]
      );
    }
    for (const testSession of testSessions) {
      if (testSession.ipAddress) {
        rateLimitIdentities.push(["login:ip", testSession.ipAddress]);
      }
    }
    const rateLimitKeys = rateLimitIdentities.map(([scope, identity]) =>
      createHash("sha256")
        .update(`${scope}:${identity}`)
        .digest("hex")
    );
    await db
      .collection("securityratelimits")
      .deleteMany({ key: { $in: rateLimitKeys } });
  }
  if (grpcClient) grpcClient.close();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const backendHealth = await fetch("http://127.0.0.1:3001/health");
  assert(backendHealth.ok, "AI backend health endpoint is unavailable");
  const frontendHealth = await fetch(`${BASE_URL}/login`);
  assert(frontendHealth.ok, "Next.js production server is unavailable");

  await setupMongoFixture();
  createGrpcClient();

  if (IS_RECRUITMENT) {
    await loginAs(RECRUITER_USERNAME);
    const created = await api("/api/recruiter/interviews", {
      method: "POST",
      body: {
        title: `E2E Recruitment ${TEST_PREFIX}`,
        jobTitle: "Backend Engineer",
        department: "Engineering",
        industry: "Công nghệ thông tin",
        employmentType: "FULL_TIME",
        workMode: "HYBRID",
        location: "TP. Hồ Chí Minh",
        jobDescription:
          "Thiết kế API gRPC, tối ưu độ trễ, giám sát production và xử lý sự cố.",
        topic: "Backend, gRPC, system design và incident response",
        language: "vi-VN",
        voiceId: "vi-VN-HoaiMyNeural",
        difficulty: "Middle",
        questionCount: 5,
        maxAttempts: 1,
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        invitationMessage: "Thư mời từ bài kiểm thử E2E recruiter.",
        candidateEmails: [CANDIDATE_EMAIL],
      },
    });
    assert(
      created.status === 201 && created.data.campaignId,
      `Recruitment campaign creation failed: status=${created.status}`
    );
    campaignId = created.data.campaignId;

    let invitation;
    const invitationDeadline = Date.now() + 20_000;
    while (Date.now() < invitationDeadline) {
      invitation = await db.collection("recruitmentinvitations").findOne({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        candidateId: userId,
      });
      if (invitation?.emailStatus === "SENT") break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert(
      invitation?.emailStatus === "SENT" &&
        invitation.practiceSessionId,
      "Recruitment invitation was not created and delivered"
    );
    invitationId = invitation._id.toString();
    practiceId = invitation.practiceSessionId.toString();
    await loginAs(TEST_PREFIX);

    const assignedSession = await api(`/api/practice/${practiceId}`);
    assert(
      assignedSession.status === 200 &&
        assignedSession.data.session?.source === "recruitment" &&
        assignedSession.data.session?.lockedConfig === true,
      "Candidate cannot open the locked recruitment session"
    );
    const freeQuote = await api(`/api/practice/${practiceId}/quote`, {
      method: "POST",
      body: { duration: 25, hasUploadedJdFile: true },
    });
    assert(
      freeQuote.status === 200 &&
        freeQuote.data.quote?.totalCredits === 0,
      "Recruitment quote is not sponsored"
    );
    const viewedInvitation = await db
      .collection("recruitmentinvitations")
      .findOne({ _id: invitation._id });
    assert(
      viewedInvitation?.status === "VIEWED",
      "Opening the assigned session did not mark it viewed"
    );
  } else {
    await loginAs(TEST_PREFIX);
    const created = await api("/api/practice", {
      method: "POST",
      body: {
        title: "E2E Backend Engineer",
        industry: "Công nghệ thông tin",
        jobDescription:
          "Thiết kế API gRPC, tối ưu độ trễ, giám sát production và xử lý sự cố.",
        topic: "Backend, gRPC, system design và incident response",
      },
    });
    assert(
      created.status === 200 && created.data.session?.id,
      "Practice creation failed"
    );
    practiceId = created.data.session.id;
  }

  const idempotencyKey = randomUUID();
  const startPayload = {
    title: "E2E Backend Engineer",
    industry: "Công nghệ thông tin",
    jobDescription:
      "Thiết kế API gRPC, tối ưu độ trễ, giám sát production và xử lý sự cố.",
    topic: "Backend, gRPC, system design và incident response",
    difficulty: "Middle",
    duration: 5,
    language: "vi-VN",
    voiceId: "hn_female_ngochuyen_full_48k-fhg",
    hasUploadedJdFile: false,
    idempotencyKey,
  };
  const startAt = Date.now();
  const firstStartPromise = api(`/api/practice/${practiceId}/start`, {
    method: "POST",
    body: startPayload,
  });
  await new Promise((resolve) => setTimeout(resolve, 750));
  const concurrentStart = await api(
    `/api/practice/${practiceId}/start`,
    {
      method: "POST",
      body: startPayload,
    }
  );
  assert(
    (concurrentStart.status === 409 &&
      concurrentStart.data.preparing === true) ||
      (concurrentStart.status === 200 &&
        concurrentStart.data.success === true),
    "Concurrent start did not return preparing/idempotent success"
  );
  const firstStart = await firstStartPromise;
  const started =
    firstStart.status === 200 ? firstStart : concurrentStart;
  if (
    started.status === 200 &&
    started.data.success &&
    started.data.questions?.[0] &&
    !started.data.firstQuestionAudio
  ) {
    const firstQuestion = started.data.questions[0];
    const firstAudio = await api("/api/ai/tts/preview", {
      method: "POST",
      body: {
        text: (firstQuestion.ttsText || firstQuestion.text).slice(0, 500),
        language: "vi-VN",
        voiceId: startPayload.voiceId,
      },
    });
    if (firstAudio.status === 200 && firstAudio.data.success) {
      started.data.firstQuestionAudio = {
        audioBase64: firstAudio.data.audioBase64,
        contentType: firstAudio.data.contentType,
      };
    }
  }
  assert(
    started.status === 200 &&
      started.data.success &&
      started.data.questions?.length === 5 &&
      started.data.firstQuestionAudio?.audioBase64,
    `Interview start failed: status=${started.status} message=${String(
      started.data?.message || "missing first question audio"
    ).slice(0, 200)}`
  );
  const startElapsedMs = Date.now() - startAt;
  runId = started.data.runId;

  const afterFirstStart = await db
    .collection("users")
    .findOne({ _id: userId }, { projection: { credits: 1 } });
  const chargeCount = await db.collection("creditlogs").countDocuments({
    userId,
    action: "AI_INTERVIEW",
    referenceId: runId,
  });
  assert(
    afterFirstStart?.credits === (IS_RECRUITMENT ? 1000 : 950),
    "First start charged incorrectly"
  );
  assert(
    chargeCount === (IS_RECRUITMENT ? 0 : 1),
    IS_RECRUITMENT
      ? "Recruitment start charged candidate credits"
      : "First start did not create one credit log"
  );
  if (IS_RECRUITMENT) {
    const startedInvitation = await db
      .collection("recruitmentinvitations")
      .findOne({ _id: new mongoose.Types.ObjectId(invitationId) });
    assert(
      startedInvitation?.status === "IN_PROGRESS" &&
        startedInvitation.lastRunId?.toString() === runId,
      "Recruitment invitation did not transition to IN_PROGRESS"
    );
  }

  const replay = await api(`/api/practice/${practiceId}/start`, {
    method: "POST",
    body: startPayload,
  });
  const afterReplay = await db
    .collection("users")
    .findOne({ _id: userId }, { projection: { credits: 1 } });
  assert(
    replay.status === 200 && replay.data.runId === runId,
    "Idempotent start replay failed"
  );
  assert(
    afterReplay?.credits === (IS_RECRUITMENT ? 1000 : 950),
    "Replay charged credits twice"
  );

  const streamToken = await api(
    `/api/ai/interview/${runId}/stream-token`,
    { method: "POST", body: {} }
  );
  assert(
    streamToken.status === 200 &&
      streamToken.data.success &&
      streamToken.data.token &&
      streamToken.data.websocketUrl,
    "AssemblyAI streaming token creation failed"
  );

  const opening = await api(`/api/ai/interview/${runId}/opening`, {
    method: "POST",
    body: {
      prompt: "Opening smoke prompt",
      transcript: "Tôi là kỹ sư backend và đã xây dựng nhiều dịch vụ production.",
      durationSec: 5,
      transcriptionProvider: "manual",
    },
  });
  assert(
    opening.status === 200 && opening.data.success,
    "Interview opening was not persisted"
  );
  const persistedOpening = await db.collection("practiceruns").findOne(
    { _id: new mongoose.Types.ObjectId(runId), userId },
    { projection: { candidateIntro: 1, answers: 1, questionCount: 1 } }
  );
  assert(
    persistedOpening?.candidateIntro?.transcript &&
      persistedOpening.answers?.length === 0 &&
      persistedOpening.questionCount === 5,
    "Opening was incorrectly counted as a knowledge answer"
  );

  tempDirectory = await mkdtemp(path.join(os.tmpdir(), "interv-e2e-"));
  const mp3Path = path.join(tempDirectory, "question.mp3");
  const oggPath = path.join(tempDirectory, "answer.ogg");
  await writeFile(
    mp3Path,
    Buffer.from(started.data.firstQuestionAudio.audioBase64, "base64")
  );
  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      mp3Path,
      "-c:a",
      "libopus",
      oggPath,
    ],
    { encoding: "utf8" }
  );
  assert(
    ffmpeg.status === 0,
    `ffmpeg conversion failed: ${(ffmpeg.stderr || "").slice(0, 200)}`
  );
  const oggAudio = await readFile(oggPath);
  assert(
    oggAudio.subarray(0, 4).toString("ascii") === "OggS",
    "Generated answer audio is not OGG"
  );

  const answers = [
    "Tôi bắt đầu bằng việc làm rõ mục tiêu, SLO và ràng buộc. Sau đó tôi đo baseline, thiết kế thay đổi nhỏ có metric, canary và phương án rollback.",
    "Tôi tách contract gRPC khỏi implementation, đặt deadline, retry có backoff và idempotency key. Mỗi lỗi đều có mã rõ ràng và trace xuyên dịch vụ.",
    "Khi có sự cố, tôi ưu tiên giảm tác động, kiểm tra dashboard và log theo correlation ID, rollback nếu cần rồi mới phân tích nguyên nhân gốc.",
    "Tôi kiểm thử bằng unit, contract và integration test, đồng thời mô phỏng timeout, request trùng, dependency lỗi và dữ liệu đầu vào không tin cậy.",
    "Tôi theo dõi p50, p95, p99, error rate và saturation. Sau triển khai tôi so sánh với baseline và ghi lại quyết định kỹ thuật cùng rủi ro còn lại.",
  ];
  let firstAnswerReplay;
  for (let index = 0; index < 5; index += 1) {
    const form = new FormData();
    form.set("questionId", `q_${index + 1}`);
    form.set("answer", answers[index]);
    form.set("durationSec", "6");
    form.set("transcriptionProvider", "manual");
    form.set(
      "audio",
      new Blob([oggAudio], { type: "audio/ogg" }),
      `answer-${index + 1}.ogg`
    );
    const answerResponse = await api(
      `/api/ai/interview/${runId}/answer`,
      { method: "POST", body: form }
    );
    assert(
      answerResponse.status === 200 &&
        answerResponse.data.success &&
        answerResponse.data.answeredCount === index + 1,
      `Answer ${index + 1} failed`
    );
    if (index === 0) {
      const replayForm = new FormData();
      replayForm.set("questionId", "q_1");
      replayForm.set("answer", answers[0]);
      replayForm.set("durationSec", "6");
      replayForm.set("transcriptionProvider", "manual");
      firstAnswerReplay = await api(
        `/api/ai/interview/${runId}/answer`,
        { method: "POST", body: replayForm }
      );
    }
  }
  assert(
    firstAnswerReplay?.status === 200 &&
      firstAnswerReplay.data.idempotentReplay === true,
    "Answer idempotency replay failed"
  );
  const storedAudioCount = await db
    .collection("practiceaudios")
    .countDocuments({ userId, runId: new mongoose.Types.ObjectId(runId) });
  assert(
    storedAudioCount === 5,
    `Expected 5 stored audio answers, received ${storedAudioCount}`
  );

  const finished = await api(`/api/ai/interview/${runId}/finish`, {
    method: "POST",
    body: {
      practiceId,
      duration: "E2E smoke",
    },
  });
  assert(
    finished.status === 200 &&
      finished.data.success &&
      finished.data.result?.audioAnalysis?.provider === "sensevoice" &&
      Number.isFinite(finished.data.result?.score),
    `SenseVoice/DeepSeek evaluation failed: status=${
      finished.status
    } message=${String(finished.data?.message || "unknown").slice(0, 200)}`
  );

  const result = await api(`/api/ai/interview/${runId}/result`);
  assert(
    result.status === 200 &&
      result.data.success &&
      result.data.run?.status === "COMPLETED" &&
      result.data.run?.answeredCount === 5 &&
      (!IS_RECRUITMENT ||
        (Array.isArray(result.data.run?.result?.candidateIntroItems) &&
          result.data.run.result.candidateIntroItems.length > 0)),
    "Persisted interview result is invalid"
  );

  const finalChargeCount = await db.collection("creditlogs").countDocuments({
    userId,
    action: "AI_INTERVIEW",
    referenceId: runId,
  });
  assert(
    finalChargeCount === (IS_RECRUITMENT ? 0 : 1),
    IS_RECRUITMENT
      ? "Recruitment interview created a credit charge"
      : "Interview was charged more than once"
  );

  let usageEvents = [];
  let persistedRun;
  const usageDeadline = Date.now() + 15_000;
  while (Date.now() < usageDeadline) {
    usageEvents = await db
      .collection("aiusageevents")
      .find({ userId, practiceRunId: new mongoose.Types.ObjectId(runId) })
      .toArray();
    persistedRun = await db.collection("practiceruns").findOne(
      { _id: new mongoose.Types.ObjectId(runId), userId },
      { projection: { tokenUsage: 1 } }
    );
    const operations = new Set(usageEvents.map((event) => event.operation));
    if (
      operations.has("interview_start") &&
      operations.has("interview_evaluate") &&
      (!IS_RECRUITMENT || operations.has("interview_profile_extract")) &&
      persistedRun?.tokenUsage?.totalTokens > 0
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const trackedOperations = new Set(
    usageEvents.map((event) => event.operation)
  );
  const trackedTokens = usageEvents.reduce(
    (total, event) => total + Number(event.totalTokens || 0),
    0
  );
  const trackedCostUsd = usageEvents.reduce(
    (total, event) => total + Number(event.estimatedCostUsd || 0),
    0
  );
  assert(
    trackedOperations.has("interview_start") &&
      trackedOperations.has("interview_evaluate") &&
      (!IS_RECRUITMENT || trackedOperations.has("interview_profile_extract")),
    "DeepSeek start/evaluation usage was not persisted"
  );
  assert(
    trackedTokens > 0 &&
      trackedCostUsd > 0 &&
      persistedRun?.tokenUsage?.totalTokens === trackedTokens,
    "DeepSeek token/cost aggregate is missing or inconsistent"
  );

  if (IS_RECRUITMENT) {
    const completedInvitation = await db
      .collection("recruitmentinvitations")
      .findOne({ _id: new mongoose.Types.ObjectId(invitationId) });
    assert(
      completedInvitation?.status === "COMPLETED" &&
        completedInvitation.lastRunId?.toString() === runId &&
        Number.isFinite(completedInvitation.finalScore),
      "Recruitment invitation did not transition to COMPLETED"
    );

    await loginAs(RECRUITER_USERNAME);
    const recruiterHistory = await api("/api/recruiter/history");
    const historyItem = recruiterHistory.data.interviews?.find(
      (item) =>
        item.practiceSessionId === practiceId &&
        item.campaign?.id === campaignId
    );
    assert(
      recruiterHistory.status === 200 &&
        historyItem?.result &&
        Array.isArray(historyItem.result.candidateIntroItems) &&
        historyItem.result.candidateIntroItems.length > 0 &&
        Number.isFinite(historyItem.score),
      "Completed result is missing from recruiter history"
    );
    const campaignDetail = await api(
      `/api/recruiter/interviews/${campaignId}`
    );
    const detailInvitation = campaignDetail.data.invitations?.find(
      (item) => item.id === invitationId
    );
    assert(
      campaignDetail.status === 200 &&
        detailInvitation?.status === "COMPLETED" &&
        detailInvitation.latestResult &&
        Array.isArray(detailInvitation.latestResult.candidateIntroItems) &&
        detailInvitation.latestResult.candidateIntroItems.length > 0,
      "Completed result is missing from recruiter campaign detail"
    );
  }

  console.log(
    JSON.stringify({
      success: true,
      mode: E2E_MODE,
      startElapsedMs,
      concurrentStartStatus: concurrentStart.status,
      questionCount: started.data.questions.length,
      answeredCount: result.data.run.answeredCount,
      evaluationProvider: finished.data.provider,
      audioProvider: finished.data.result.audioAnalysis.provider,
      creditsCharged: IS_RECRUITMENT ? 0 : 50,
      duplicateCharges: 0,
      deepseekUsageEvents: usageEvents.length,
      deepseekTokensTracked: trackedTokens,
      deepseekCostTrackedUsd: trackedCostUsd,
      ...(IS_RECRUITMENT
        ? {
            invitationLifecycle:
              "INVITED>VIEWED>IN_PROGRESS>COMPLETED",
            recruiterHistoryVisible: true,
          }
        : {}),
    })
  );
}

try {
  await main();
} finally {
  await cleanup();
}
