import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE_URL =
  process.env.E2E_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET?.trim();
const MONGODB_URI = process.env.MONGODB_URI?.trim();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(MONGODB_URI, "MONGODB_URI is required");
assert(
  ACCESS_SECRET && Buffer.byteLength(ACCESS_SECRET, "utf8") >= 32,
  "JWT_ACCESS_SECRET must be configured"
);

const fixtureKey = `candidate_interviews_${Date.now().toString(36)}_${randomUUID()
  .replaceAll("-", "")
  .slice(0, 6)}`;
const candidateId = new mongoose.Types.ObjectId();
const recruiterId = new mongoose.Types.ObjectId();
const campaignId = new mongoose.Types.ObjectId();
const practiceSessionId = new mongoose.Types.ObjectId();
const invitationId = new mongoose.Types.ObjectId();
const candidateSessionId = new mongoose.Types.ObjectId();
const recruiterSessionId = new mongoose.Types.ObjectId();
let database;

function accessToken(userId, sessionId) {
  return jwt.sign(
    {
      userId: userId.toString(),
      sessionId: sessionId.toString(),
      tokenType: "access",
    },
    ACCESS_SECRET,
    {
      algorithm: "HS256",
      audience: "interv-web",
      issuer: "interv",
      expiresIn: "15m",
    }
  );
}

async function request(pathname, token) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(token ? { Cookie: `access_token=${token}` } : {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function setupFixture() {
  await mongoose.connect(MONGODB_URI);
  database = mongoose.connection.db;
  assert(database, "MongoDB connection is unavailable");

  const now = new Date();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const passwordHash = await bcrypt.hash(`${fixtureKey}-Password!`, 12);

  await database.collection("users").insertMany([
    {
      _id: candidateId,
      username: `${fixtureKey}_candidate`,
      email: `${fixtureKey}_candidate@example.invalid`,
      password: passwordHash,
      role: "user",
      avatar: "",
      socialLinks: [],
      isVerified: true,
      isActive: true,
      credits: 500,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: recruiterId,
      username: `${fixtureKey}_recruiter`,
      email: `${fixtureKey}_recruiter@example.invalid`,
      password: passwordHash,
      role: "recruiter",
      avatar: "",
      socialLinks: [],
      isVerified: true,
      isActive: true,
      credits: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await database.collection("recruitmentcampaigns").insertOne({
    _id: campaignId,
    recruiterId,
    title: "Phỏng vấn Backend Engineer",
    jobTitle: "Backend Engineer",
    department: "Engineering",
    industry: "Công nghệ thông tin",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    location: "TP. Hồ Chí Minh",
    jobDescription: "Fixture for candidate interview listing.",
    topic: "Backend systems",
    language: "vi-VN",
    voiceId: "vi-VN-HoaiMyNeural",
    difficulty: "Middle",
    questionCount: 5,
    maxAttempts: 2,
    startsAt,
    endsAt,
    invitationMessage: "Mời bạn hoàn thành vòng phỏng vấn AI.",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });

  await database.collection("practicesessions").insertOne({
    _id: practiceSessionId,
    userId: candidateId,
    source: "recruitment",
    recruitmentCampaignId: campaignId,
    recruitmentInvitationId: invitationId,
    recruiterId,
    scheduledAt: startsAt,
    expiresAt: endsAt,
    maxAttempts: 2,
    lockedConfig: true,
    title: "Phỏng vấn Backend Engineer",
    jobDescription: "Fixture for candidate interview listing.",
    topic: "Backend systems",
    industry: "Công nghệ thông tin",
    language: "vi-VN",
    voiceId: "vi-VN-HoaiMyNeural",
    difficulty: "Middle",
    questionCount: 5,
    tags: ["Tuyển dụng", "Backend Engineer"],
    attemptCount: 0,
    highestScore: 0,
    createdAt: now,
    updatedAt: now,
  });

  await database.collection("recruitmentinvitations").insertOne({
    _id: invitationId,
    campaignId,
    recruiterId,
    candidateId,
    practiceSessionId,
    candidateEmail: `${fixtureKey}_candidate@example.invalid`,
    status: "INVITED",
    emailStatus: "SENT",
    emailAttempts: 1,
    invitedAt: now,
    sentAt: now,
    expiresAt: endsAt,
    createdAt: now,
    updatedAt: now,
  });

  await database.collection("sessions").insertMany([
    {
      _id: candidateSessionId,
      userId: candidateId,
      deviceInfo: "Candidate interviews smoke test",
      ipAddress: "127.0.0.1",
      isActive: true,
      lastActiveAt: now,
      refreshTokenHash: "",
      previousRefreshTokenHash: "",
      refreshExpiresAt: endsAt,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: recruiterSessionId,
      userId: recruiterId,
      deviceInfo: "Candidate interviews role boundary test",
      ipAddress: "127.0.0.1",
      isActive: true,
      lastActiveAt: now,
      refreshTokenHash: "",
      previousRefreshTokenHash: "",
      refreshExpiresAt: endsAt,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

async function cleanup() {
  if (!database) return;
  await Promise.all([
    database
      .collection("recruitmentinvitations")
      .deleteMany({ _id: invitationId }),
    database
      .collection("recruitmentcampaigns")
      .deleteMany({ _id: campaignId }),
    database
      .collection("practicesessions")
      .deleteMany({ _id: practiceSessionId }),
    database
      .collection("sessions")
      .deleteMany({ _id: { $in: [candidateSessionId, recruiterSessionId] } }),
    database
      .collection("users")
      .deleteMany({ _id: { $in: [candidateId, recruiterId] } }),
  ]);
}

async function main() {
  const frontendHealth = await fetch(`${BASE_URL}/interviews`, {
    signal: AbortSignal.timeout(60_000),
  });
  assert(frontendHealth.ok, "Candidate interviews page is unavailable");

  await setupFixture();

  const unauthenticated = await request("/api/interviews");
  assert(
    unauthenticated.status === 401,
    `Expected anonymous status 401, received ${unauthenticated.status}`
  );

  const recruiter = await request(
    "/api/interviews",
    accessToken(recruiterId, recruiterSessionId)
  );
  assert(
    recruiter.status === 403,
    `Expected recruiter status 403, received ${recruiter.status}`
  );

  const candidate = await request(
    "/api/interviews",
    accessToken(candidateId, candidateSessionId)
  );
  const item = candidate.body.interviews?.[0];
  assert(
    candidate.status === 200 && candidate.body.success,
    `Candidate request failed with status ${candidate.status}`
  );
  assert(
    candidate.body.stats?.total === 1 &&
      candidate.body.stats?.pending === 1,
    "Candidate interview statistics are incorrect"
  );
  assert(
    item?.id === invitationId.toString() &&
      item?.practiceSessionId === practiceSessionId.toString(),
    "Invitation and practice session linkage is incorrect"
  );
  assert(
    item?.campaign?.id === campaignId.toString() &&
      item?.campaign?.jobTitle === "Backend Engineer" &&
      item?.recruiter?.id === recruiterId.toString(),
    "Campaign or recruiter data is missing"
  );
  assert(
    item?.attemptCount === 0 &&
      item?.maxAttempts === 2 &&
      item?.status === "INVITED",
    "Invitation attempt or status data is incorrect"
  );
  assert(
    !Object.hasOwn(item?.campaign || {}, "jobDescription"),
    "Candidate list response exposes unnecessary job description data"
  );

  console.log(
    JSON.stringify({
      success: true,
      anonymousBoundary: 401,
      recruiterBoundary: 403,
      candidateStatus: candidate.status,
      invitationCount: candidate.body.interviews.length,
      campaignLinked: true,
      practiceSessionLinked: true,
    })
  );
}

try {
  await main();
} finally {
  await cleanup();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
