import { createHash } from "node:crypto";

import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseUrl =
  process.env.INTERV_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";
const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) {
  throw new Error("MONGODB_URI is required");
}
const eventMongoUri = process.env.MONGODB_URI_EVENT?.trim();
if (!eventMongoUri) {
  throw new Error("MONGODB_URI_EVENT is required");
}
const useCsrfFallback =
  process.env.INTERV_CSRF_FALLBACK?.trim().toLowerCase() === "true";
const observedRequestIds = new Set();

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") || ""];
  return values
    .filter(Boolean)
    .map((value) => value.split(";")[0])
    .join("; ");
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.method && options.method !== "GET"
      ? useCsrfFallback
        ? { "X-Requested-With": "XMLHttpRequest" }
        : {
            Origin: baseUrl,
            "Sec-Fetch-Site": "same-origin",
            "X-Requested-With": "XMLHttpRequest",
          }
      : {}),
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...options.headers,
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: options.redirect || "manual",
  });
  const contentType = response.headers.get("content-type") || "";
  const requestId = response.headers.get("x-request-id");
  if (
    requestId &&
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId)
  ) {
    observedRequestIds.add(requestId);
  }
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, payload };
}

async function login(email, password, expectedRole) {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: { identifier: email, password, rememberMe: false },
  });
  assert(
    result.response.status === 200,
    `login ${email} status=${result.response.status} payload=${JSON.stringify(
      result.payload
    ).slice(0, 240)}`
  );
  assert(
    result.payload.role === expectedRole &&
      result.payload.user?.role === expectedRole,
    `login ${email} returns role=${expectedRole}`
  );
  return cookieHeader(result.response);
}

async function waitFor(check, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

function redirectsTo(result, target) {
  const location = result.response.headers.get("location");
  if (location) {
    return location === target || location.endsWith(target);
  }
  return (
    typeof result.payload === "string" &&
    result.payload.includes("NEXT_REDIRECT") &&
    result.payload.includes(`;${target};`)
  );
}

const suffix = `${Date.now().toString(36)}${Math.random()
  .toString(36)
  .slice(2, 7)}`;
const prefix = `rb${suffix.slice(0, 12)}`;
const password = `InterV!Smoke-${suffix}-Password`;
const accounts = {
  admin: {
    username: `${prefix}_adm`,
    email: `${prefix}_admin@example.test`,
    role: "admin",
  },
  recruiter: {
    username: `${prefix}_rec`,
    email: `${prefix}_recruiter@example.test`,
    role: "recruiter",
  },
  candidate: {
    username: `${prefix}_c1`,
    email: `${prefix}_candidate@example.test`,
    role: "user",
  },
  secondCandidate: {
    username: `${prefix}_c2`,
    email: `${prefix}_candidate2@example.test`,
    role: "user",
  },
  promotable: {
    username: `${prefix}_pro`,
    email: `${prefix}_promotable@example.test`,
    role: "user",
  },
};

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 });
const eventConnection = await mongoose
  .createConnection(eventMongoUri, {
    dbName: process.env.MONGODB_EVENT_DB_NAME || "interv-events",
    serverSelectionTimeoutMS: 10_000,
  })
  .asPromise();
const db = mongoose.connection.db;
if (!db) throw new Error("MongoDB connection unavailable");
const eventDb = eventConnection.db;
if (!eventDb) throw new Error("Event MongoDB connection unavailable");
const users = db.collection("users");
const sessions = db.collection("sessions");
const campaigns = db.collection("recruitmentcampaigns");
const invitations = db.collection("recruitmentinvitations");
const practices = db.collection("practicesessions");
const auditLogs = db.collection("adminauditlogs");
const creditLogs = db.collection("creditlogs");
const transactions = db.collection("transactions");
const aiUsageEvents = db.collection("aiusageevents");
const apiRequestLogs = eventDb.collection("apirequestlogs");

let userIds = [];
let campaignId;
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const insert = await users.insertMany(
    Object.values(accounts).map((account) => ({
      ...account,
      password: passwordHash,
      avatar: "",
      socialLinks: [],
      isVerified: true,
      isActive: true,
      credits: 500,
      createdAt: now,
      updatedAt: now,
    }))
  );
  userIds = Object.values(insert.insertedIds);
  const byEmail = new Map(
    (
      await users
        .find({ _id: { $in: userIds } })
        .project({ _id: 1, email: 1 })
        .toArray()
    ).map((user) => [user.email, user._id])
  );

  const [
    adminCookie,
    recruiterCookie,
    candidateCookie,
    secondCandidateCookie,
    promotableCookie,
  ] =
    await Promise.all([
      login(accounts.admin.email, password, "admin"),
      login(accounts.recruiter.email, password, "recruiter"),
      login(accounts.candidate.email, password, "user"),
      login(accounts.secondCandidate.email, password, "user"),
      login(accounts.promotable.email, password, "user"),
    ]);

  const anonymousAdminPage = await request("/admin");
  assert(
    redirectsTo(anonymousAdminPage, "/login"),
    "anonymous admin page redirects"
  );
  const anonymousRecruiterPage = await request("/recruiter");
  assert(
    redirectsTo(anonymousRecruiterPage, "/login"),
    "anonymous recruiter page redirects"
  );

  const candidateAdminPage = await request("/admin", {
    cookie: candidateCookie,
  });
  assert(
    redirectsTo(candidateAdminPage, "/"),
    "candidate redirects to candidate home"
  );

  const recruiterAdminPage = await request("/admin", {
    cookie: recruiterCookie,
  });
  assert(
    redirectsTo(recruiterAdminPage, "/recruiter"),
    "recruiter redirects to recruiter workspace"
  );

  const adminPage = await request("/admin", { cookie: adminCookie });
  assert(adminPage.response.status === 200, "admin page is accessible");
  const recruiterPage = await request("/recruiter", {
    cookie: recruiterCookie,
  });
  assert(recruiterPage.response.status === 200, "recruiter page is accessible");
  const adminWorkspacePages = await Promise.all(
    [
      "/admin/users",
      "/admin/recruitment",
      "/admin/ai",
      "/admin/payments",
      "/admin/api-logs",
      "/admin/audit",
    ].map((path) => request(path, { cookie: adminCookie }))
  );
  assert(
    adminWorkspacePages.every((page) => page.response.status === 200),
    "all admin workspace pages render"
  );
  const recruiterWorkspacePages = await Promise.all(
    [
      "/recruiter/interviews",
      "/recruiter/interviews/new",
      "/recruiter/candidates",
      "/recruiter/history",
      "/recruiter/schedule",
    ].map((path) => request(path, { cookie: recruiterCookie }))
  );
  assert(
    recruiterWorkspacePages.every((page) => page.response.status === 200),
    "all recruiter workspace pages render"
  );

  const candidateAdminApi = await request("/api/admin/overview", {
    cookie: candidateCookie,
  });
  assert(candidateAdminApi.response.status === 403, "candidate admin API denied");
  const anonymousAdminApi = await request("/api/admin/overview");
  assert(anonymousAdminApi.response.status === 401, "anonymous admin API denied");
  const recruiterAdminApi = await request("/api/admin/overview", {
    cookie: recruiterCookie,
  });
  assert(recruiterAdminApi.response.status === 403, "recruiter admin API denied");
  const adminRecruiterApi = await request("/api/recruiter/overview", {
    cookie: adminCookie,
  });
  assert(adminRecruiterApi.response.status === 403, "admin recruiter API denied");
  const adminOverview = await request("/api/admin/overview", {
    cookie: adminCookie,
  });
  assert(adminOverview.response.status === 200, "admin overview API succeeds");
  const candidateApiLogs = await request("/api/admin/api-logs?days=7", {
    cookie: candidateCookie,
  });
  assert(
    candidateApiLogs.response.status === 403,
    "candidate API log management denied"
  );

  const candidateCreditsBeforeFinanceTests = await users.findOne(
    { _id: byEmail.get(accounts.candidate.email) },
    { projection: { credits: 1 } }
  );
  const candidateFinanceApi = await request("/api/admin/credits", {
    cookie: candidateCookie,
  });
  assert(
    candidateFinanceApi.response.status === 403,
    "candidate finance API denied"
  );
  const financeSessionId = new mongoose.Types.ObjectId();
  const financeRunId = new mongoose.Types.ObjectId();
  const usageEventKey = createHash("sha256")
    .update(`admin-smoke-ai:${suffix}`)
    .digest("hex");
  await aiUsageEvents.insertOne({
    eventKey: usageEventKey,
    provider: "deepseek",
    userId: byEmail.get(accounts.candidate.email),
    sessionId: financeSessionId,
    practiceRunId: financeRunId,
    aiRunId: `run_${suffix}`,
    operation: "interview_start",
    status: "SUCCESS",
    model: "deepseek-v4-flash",
    requestCount: 1,
    successfulRequestCount: 1,
    failedRequestCount: 0,
    promptTokens: 1_000,
    completionTokens: 234,
    totalTokens: 1_234,
    cacheHitTokens: 600,
    cacheMissTokens: 400,
    reasoningTokens: 0,
    latencyMs: 420,
    estimatedCostUsd: 0.00012192,
    pricingSnapshot: {
      cacheHitInputUsdPerMillion: 0.0028,
      cacheMissInputUsdPerMillion: 0.14,
      outputUsdPerMillion: 0.28,
    },
    providerRequestIds: [`provider_${suffix}`],
    errorCode: "",
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
  });
  const adminAiApi = await request("/api/admin/ai?days=30", {
    cookie: adminCookie,
  });
  assert(adminAiApi.response.status === 200, "admin AI API succeeds");
  assert(
    adminAiApi.payload.metrics.totalTokens >= 1_234,
    "admin AI aggregate includes persisted usage"
  );
  const adminAiBalance = await request("/api/admin/ai/balance", {
    cookie: adminCookie,
  });
  assert(
    adminAiBalance.response.status === 200 &&
      adminAiBalance.payload.service?.reachable === true &&
      adminAiBalance.payload.provider?.reachable === true &&
      adminAiBalance.payload.provider?.fastModel,
    "admin can read live DeepSeek balance through gRPC"
  );

  const orderCode =
    800_000_000_000 + Number.parseInt(suffix.slice(-6), 36);
  await transactions.insertOne({
    userId: byEmail.get(accounts.candidate.email),
    orderCode,
    amount: 50_000,
    credits: 550,
    status: "PENDING",
    providerStatus: "PENDING",
    paymentLinkId: `test-payment-${suffix}`,
    paymentUrl: "https://pay.payos.vn/web/test-only",
    cancellationReason: "",
    reconciliationError: "",
    createdAt: now,
    updatedAt: now,
  });
  const adminPaymentsApi = await request(
    `/api/admin/payments?q=${orderCode}`,
    { cookie: adminCookie }
  );
  assert(
    adminPaymentsApi.response.status === 200 &&
      adminPaymentsApi.payload.transactions.some(
        (transaction) => transaction.orderCode === orderCode
      ),
    "admin payment API lists matching PayOS transaction"
  );

  const crossOriginCreditAdjustment = await request("/api/admin/credits", {
    method: "POST",
    cookie: adminCookie,
    headers: {
      Origin: "https://attacker.example",
      "Sec-Fetch-Site": "cross-site",
    },
    body: {
      userId: byEmail.get(accounts.candidate.email).toString(),
      credits: 125,
      reason: "Cross-origin request must never change a balance",
      idempotencyKey: `blocked-${suffix}-credit`,
    },
  });
  assert(
    crossOriginCreditAdjustment.response.status === 403,
    "cross-origin credit adjustment blocked"
  );
  const unchangedAfterCrossOrigin = await users.findOne(
    { _id: byEmail.get(accounts.candidate.email) },
    { projection: { credits: 1 } }
  );
  assert(
    unchangedAfterCrossOrigin?.credits ===
      candidateCreditsBeforeFinanceTests?.credits,
    "blocked credit adjustment has no side effect"
  );
  const blockedCreditRequestId =
    crossOriginCreditAdjustment.response.headers.get("x-request-id");
  const blockedCreditLog = await waitFor(() =>
    apiRequestLogs.findOne({ requestId: blockedCreditRequestId })
  );
  assert(
    blockedCreditLog?.routeGroup === "security" &&
      blockedCreditLog?.path === "/api/admin/credits" &&
      blockedCreditLog?.statusCode === 403,
    "blocked cross-origin request is recorded as a security API log"
  );
  const serializedBlockedCreditLog = JSON.stringify(blockedCreditLog);
  assert(
    !serializedBlockedCreditLog.includes(
      "Cross-origin request must never change a balance"
    ) &&
      !Object.hasOwn(blockedCreditLog || {}, "body") &&
      !Object.hasOwn(blockedCreditLog || {}, "requestBody") &&
      !Object.hasOwn(blockedCreditLog || {}, "responseBody"),
    "API log never stores request or response bodies"
  );

  const creditAdjustmentKey = `credit-${suffix}-plus`;
  const creditAdjustment = await request("/api/admin/credits", {
    method: "POST",
    cookie: adminCookie,
    body: {
      userId: byEmail.get(accounts.candidate.email).toString(),
      credits: 125,
      reason: "Admin finance smoke test credit adjustment",
      idempotencyKey: creditAdjustmentKey,
    },
  });
  assert(
    creditAdjustment.response.status === 200,
    "admin can adjust user credits"
  );
  const replayedAdjustment = await request("/api/admin/credits", {
    method: "POST",
    cookie: adminCookie,
    body: {
      userId: byEmail.get(accounts.candidate.email).toString(),
      credits: 125,
      reason: "Admin finance smoke test credit adjustment",
      idempotencyKey: creditAdjustmentKey,
    },
  });
  assert(
    replayedAdjustment.response.status === 200 &&
      replayedAdjustment.payload.idempotentReplay === true,
    "credit adjustment replay is idempotent"
  );
  const balanceAfterReplay = await users.findOne(
    { _id: byEmail.get(accounts.candidate.email) },
    { projection: { credits: 1 } }
  );
  assert(
    balanceAfterReplay?.credits ===
      (candidateCreditsBeforeFinanceTests?.credits || 0) + 125,
    "idempotent replay does not double-credit"
  );
  const excessiveDebit = await request("/api/admin/credits", {
    method: "POST",
    cookie: adminCookie,
    body: {
      userId: byEmail.get(accounts.candidate.email).toString(),
      credits: -1_000_000,
      reason: "Admin finance smoke test excessive debit rejection",
      idempotencyKey: `credit-${suffix}-debit`,
    },
  });
  assert(
    excessiveDebit.response.status === 409,
    "credit adjustment cannot make balance negative"
  );

  const crossOriginRoleChange = await request(
    `/api/admin/users/${byEmail.get(accounts.promotable.email)}/role`,
    {
      method: "PATCH",
      cookie: adminCookie,
      headers: {
        Origin: "https://attacker.example",
        "Sec-Fetch-Site": "cross-site",
      },
      body: { role: "recruiter" },
    }
  );
  assert(
    crossOriginRoleChange.response.status === 403,
    "cross-origin admin mutation blocked"
  );
  const stillUnprivileged = await users.findOne(
    { _id: byEmail.get(accounts.promotable.email) },
    { projection: { role: 1 } }
  );
  assert(
    stillUnprivileged?.role === "user",
    "blocked cross-origin mutation has no side effect"
  );

  const selfDemotion = await request(
    `/api/admin/users/${byEmail.get(accounts.admin.email)}/role`,
    {
      method: "PATCH",
      cookie: adminCookie,
      body: { role: "user" },
    }
  );
  assert(selfDemotion.response.status === 409, "admin self-demotion blocked");

  const promote = await request(
    `/api/admin/users/${byEmail.get(accounts.promotable.email)}/role`,
    {
      method: "PATCH",
      cookie: adminCookie,
      body: { role: "recruiter" },
    }
  );
  assert(promote.response.status === 200, "admin can grant recruiter role");
  const revokedSession = await request("/api/auth/me", {
    cookie: promotableCookie,
  });
  assert(revokedSession.response.status === 401, "role change revokes sessions");
  const promotedRecruiterCookie = await login(
    accounts.promotable.email,
    password,
    "recruiter"
  );

  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const oversizedCampaign = await request("/api/recruiter/interviews", {
    method: "POST",
    cookie: recruiterCookie,
    body: {
      title: `Oversized campaign ${suffix}`,
      invitationMessage: "x".repeat(129 * 1024),
    },
  });
  assert(
    oversizedCampaign.response.status === 413,
    "oversized recruiter payload blocked"
  );

  const invalidCandidateTitle = `Invalid candidate ${suffix}`;
  const invalidCandidateCampaign = await request(
    "/api/recruiter/interviews",
    {
      method: "POST",
      cookie: recruiterCookie,
      body: {
        title: invalidCandidateTitle,
        jobTitle: "Backend Engineer",
        department: "Engineering",
        industry: "Công nghệ thông tin",
        employmentType: "FULL_TIME",
        workMode: "HYBRID",
        location: "TP. Hồ Chí Minh",
        jobDescription:
          "Xây dựng dịch vụ Node.js, gRPC, MongoDB và vận hành hệ thống production có quan sát.",
        topic: "System design, debugging và bảo mật API",
        language: "vi-VN",
        voiceId: "vi-VN-HoaiMyNeural",
        difficulty: "Middle",
        questionCount: 5,
        maxAttempts: 1,
        endsAt: endsAt.toISOString(),
        invitationMessage: "Thư mời kiểm thử.",
        candidateEmails: [`missing_${suffix}@example.test`],
      },
    }
  );
  assert(
    invalidCandidateCampaign.response.status === 422,
    "unknown candidate rejected"
  );
  assert(
    (await campaigns.countDocuments({
      recruiterId: byEmail.get(accounts.recruiter.email),
      title: invalidCandidateTitle,
    })) === 0,
    "invalid candidate does not leave a partial campaign"
  );

  const createCampaign = await request("/api/recruiter/interviews", {
    method: "POST",
    cookie: recruiterCookie,
    body: {
      title: `Backend hiring ${suffix}`,
      jobTitle: "Backend Engineer",
      department: "Engineering",
      industry: "Công nghệ thông tin",
      employmentType: "FULL_TIME",
      workMode: "HYBRID",
      location: "TP. Hồ Chí Minh",
      jobDescription:
        "Xây dựng dịch vụ Node.js, gRPC, MongoDB và vận hành hệ thống production có quan sát.",
      topic: "System design, debugging và bảo mật API",
      language: "vi-VN",
      voiceId: "vi-VN-HoaiMyNeural",
      difficulty: "Middle",
      questionCount: 5,
      maxAttempts: 1,
      endsAt: endsAt.toISOString(),
      invitationMessage: "Đây là thư mời kiểm thử tự động.",
      candidateEmails: [accounts.candidate.email],
    },
  });
  assert(createCampaign.response.status === 201, "campaign creation succeeds");
  campaignId = createCampaign.payload.campaignId;
  assert(
    /^[0-9a-f]{24}$/i.test(campaignId),
    "campaign id returned"
  );
  const crossRecruiterRead = await request(
    `/api/recruiter/interviews/${campaignId}`,
    { cookie: promotedRecruiterCookie }
  );
  assert(
    crossRecruiterRead.response.status === 404,
    "another recruiter cannot read campaign"
  );
  const crossRecruiterMutation = await request(
    `/api/recruiter/interviews/${campaignId}/candidates`,
    {
      method: "POST",
      cookie: promotedRecruiterCookie,
      body: { candidateEmails: [accounts.secondCandidate.email] },
    }
  );
  assert(
    crossRecruiterMutation.response.status === 404,
    `another recruiter cannot mutate campaign status=${
      crossRecruiterMutation.response.status
    } payload=${JSON.stringify(crossRecruiterMutation.payload).slice(0, 240)}`
  );
  const campaignPage = await request(
    `/recruiter/interviews/${campaignId}`,
    { cookie: recruiterCookie }
  );
  assert(
    campaignPage.response.status === 200,
    "dynamic recruiter campaign page renders"
  );

  const deliveredInvitation = await waitFor(async () => {
    const invitation = await invitations.findOne({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      candidateEmail: accounts.candidate.email,
    });
    return invitation?.emailStatus === "SENT" ? invitation : null;
  });
  assert(deliveredInvitation, "dry-run invitation reaches SENT");

  const detail = await request(
    `/api/recruiter/interviews/${campaignId}`,
    { cookie: recruiterCookie }
  );
  assert(detail.response.status === 200, "campaign detail succeeds");
  assert(detail.payload.invitations.length === 1, "first candidate linked");
  const practiceSessionId = detail.payload.invitations[0].practiceSessionId;

  const candidatePractice = await request(
    `/api/practice/${practiceSessionId}`,
    { cookie: candidateCookie }
  );
  assert(candidatePractice.response.status === 200, "candidate opens assigned interview");
  assert(
    candidatePractice.payload.session.source === "recruitment" &&
      candidatePractice.payload.session.lockedConfig === true,
    "assigned interview is locked recruitment session"
  );
  const crossCandidatePractice = await request(
    `/api/practice/${practiceSessionId}`,
    { cookie: secondCandidateCookie }
  );
  assert(
    crossCandidatePractice.response.status === 404,
    "another candidate cannot read assigned interview"
  );
  const viewed = await invitations.findOne({
    _id: deliveredInvitation._id,
  });
  assert(viewed?.status === "VIEWED", "opening interview marks invitation viewed");

  const duplicateCandidate = await request(
    `/api/recruiter/interviews/${campaignId}/candidates`,
    {
      method: "POST",
      cookie: recruiterCookie,
      body: { candidateEmails: [accounts.candidate.email] },
    }
  );
  assert(
    duplicateCandidate.response.status === 409,
    "duplicate campaign candidate rejected"
  );

  const freeQuote = await request(`/api/practice/${practiceSessionId}/quote`, {
    method: "POST",
    cookie: candidateCookie,
    body: { duration: 25, hasUploadedJdFile: true },
  });
  assert(
    freeQuote.response.status === 200 &&
      freeQuote.payload.quote.totalCredits === 0,
    "recruitment interview costs candidate zero credits"
  );

  const lockedUpdate = await request(`/api/practice/${practiceSessionId}`, {
    method: "PUT",
    cookie: candidateCookie,
    body: { title: "Tampered title" },
  });
  assert(lockedUpdate.response.status === 403, "candidate cannot edit locked config");
  const lockedDelete = await request(`/api/practice/${practiceSessionId}`, {
    method: "DELETE",
    cookie: candidateCookie,
  });
  assert(lockedDelete.response.status === 403, "candidate cannot delete assigned interview");

  const addCandidate = await request(
    `/api/recruiter/interviews/${campaignId}/candidates`,
    {
      method: "POST",
      cookie: recruiterCookie,
      body: { candidateEmails: [accounts.secondCandidate.email] },
    }
  );
  assert(addCandidate.response.status === 201, "recruiter adds existing candidate");
  const secondDelivered = await waitFor(async () => {
    const invitation = await invitations.findOne({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      candidateEmail: accounts.secondCandidate.email,
    });
    return invitation?.emailStatus === "SENT" ? invitation : null;
  });
  assert(secondDelivered, "second invitation reaches SENT");

  const resendInvitation = await request(
    `/api/recruiter/interviews/${campaignId}/candidates/${deliveredInvitation._id}`,
    {
      method: "PATCH",
      cookie: recruiterCookie,
      body: { action: "resend" },
    }
  );
  assert(resendInvitation.response.status === 200, "recruiter resends invitation");
  const redeliveredInvitation = await waitFor(async () => {
    const invitation = await invitations.findOne({
      _id: deliveredInvitation._id,
    });
    return invitation?.emailStatus === "SENT" &&
      invitation.status === "INVITED"
      ? invitation
      : null;
  });
  assert(redeliveredInvitation, "resent invitation reaches SENT");

  const cancelInvitation = await request(
    `/api/recruiter/interviews/${campaignId}/candidates/${secondDelivered._id}`,
    {
      method: "PATCH",
      cookie: recruiterCookie,
      body: { action: "cancel" },
    }
  );
  assert(cancelInvitation.response.status === 200, "recruiter cancels invitation");
  const cancelledInvitation = await invitations.findOne({
    _id: secondDelivered._id,
  });
  assert(
    cancelledInvitation?.status === "CANCELLED",
    "cancelled invitation is persisted"
  );

  const closeCampaign = await request(
    `/api/recruiter/interviews/${campaignId}`,
    {
      method: "PATCH",
      cookie: recruiterCookie,
      body: { status: "CLOSED" },
    }
  );
  assert(closeCampaign.response.status === 200, "campaign can be closed");
  const closedCampaignCandidate = await request(
    `/api/recruiter/interviews/${campaignId}/candidates`,
    {
      method: "POST",
      cookie: recruiterCookie,
      body: { candidateEmails: [accounts.candidate.email] },
    }
  );
  assert(
    closedCampaignCandidate.response.status === 404,
    "closed campaign rejects new candidates"
  );
  const closedCampaignResend = await request(
    `/api/recruiter/interviews/${campaignId}/candidates/${deliveredInvitation._id}`,
    {
      method: "PATCH",
      cookie: recruiterCookie,
      body: { action: "resend" },
    }
  );
  assert(
    closedCampaignResend.response.status === 409,
    "closed campaign rejects invitation resend"
  );
  const blockedStart = await request(`/api/practice/${practiceSessionId}/start`, {
    method: "POST",
    cookie: candidateCookie,
    body: {
      title: "Tampered",
      industry: "Tampered",
      jobDescription: "Tampered",
      topic: "",
      difficulty: "Senior",
      duration: 25,
      language: "vi-VN",
      voiceId: "vi-VN-HoaiMyNeural",
      hasUploadedJdFile: true,
      idempotencyKey: `smoke-${suffix}-1234567890`,
    },
  });
  assert(blockedStart.response.status === 409, "closed campaign blocks interview start");

  const candidateRecruiterApi = await request("/api/recruiter/candidates", {
    cookie: candidateCookie,
  });
  assert(candidateRecruiterApi.response.status === 403, "candidate recruiter API denied");
  const recruiterCandidates = await request("/api/recruiter/candidates", {
    cookie: recruiterCookie,
  });
  assert(
    recruiterCandidates.response.status === 200 &&
      recruiterCandidates.payload.pagination.total === 2,
    "recruiter candidate pipeline returns both invitations"
  );
  const adminRecruitment = await request("/api/admin/recruitment", {
    cookie: adminCookie,
  });
  assert(
    adminRecruitment.response.status === 200 &&
      adminRecruitment.payload.campaigns.some(
        (campaign) => campaign.id === campaignId
      ),
    "admin recruitment monitor sees campaign"
  );
  const audit = await request(
    `/api/admin/audit?q=${encodeURIComponent(suffix)}`,
    { cookie: adminCookie }
  );
  assert(
    audit.response.status === 200 && audit.payload.pagination.total >= 1,
    "audit log contains campaign action"
  );
  const adminApiLogs = await request("/api/admin/api-logs?days=7", {
    cookie: adminCookie,
  });
  assert(
    adminApiLogs.response.status === 200 &&
      adminApiLogs.payload.settings?.retentionDays === 7 &&
      adminApiLogs.payload.metrics?.requests >= 1,
    "admin API log route returns metrics with fixed seven-day retention"
  );
  const adminApiLogRequestId =
    adminApiLogs.response.headers.get("x-request-id");
  const persistedAdminApiLog = await waitFor(() =>
    apiRequestLogs.findOne({ requestId: adminApiLogRequestId })
  );
  assert(
    persistedAdminApiLog?.actorId?.toString() ===
      byEmail.get(accounts.admin.email).toString(),
    "signed admin actor is correlated without storing a token"
  );
  const ttlIndexes = await apiRequestLogs.indexes();
  const ttlIndex = ttlIndexes.find(
    (index) =>
      index.key?.createdAt === 1 &&
      index.expireAfterSeconds !== undefined
  );
  assert(
    ttlIndex?.expireAfterSeconds === 7 * 24 * 60 * 60,
    "API logs have a fixed seven-day MongoDB TTL index"
  );
  const schedule = await request("/api/recruiter/schedule", {
    cookie: recruiterCookie,
  });
  assert(
    schedule.response.status === 200 &&
      schedule.payload.events.some((event) => event.campaignId === campaignId),
    "schedule contains campaign deadline"
  );

  const archiveCampaign = await request(
    `/api/recruiter/interviews/${campaignId}`,
    {
      method: "DELETE",
      cookie: recruiterCookie,
    }
  );
  assert(archiveCampaign.response.status === 200, "campaign can be archived");
  const archivedCampaign = await campaigns.findOne({
    _id: new mongoose.Types.ObjectId(campaignId),
  });
  const archivedInvitation = await invitations.findOne({
    _id: deliveredInvitation._id,
  });
  assert(
    archivedCampaign?.status === "ARCHIVED" &&
      archivedInvitation?.status === "CANCELLED",
    "archive atomically cancels unfinished invitations"
  );
  const reopenArchived = await request(
    `/api/recruiter/interviews/${campaignId}`,
    {
      method: "PATCH",
      cookie: recruiterCookie,
      body: { status: "ACTIVE" },
    }
  );
  assert(
    reopenArchived.response.status === 409,
    "archived campaign cannot be reopened"
  );

  console.log(
    JSON.stringify({
      success: true,
      pageGuards: true,
      allWorkspacePagesRender: true,
      apiRoleIsolation: true,
      tenantIsolation: true,
      candidateOwnershipIsolation: true,
      anonymousApiDenied: true,
      csrfMutationBlocked: true,
      oversizedPayloadBlocked: true,
      invalidCandidateAtomicity: true,
      duplicateCandidateBlocked: true,
      roleAssignmentAndSessionRevocation: true,
      campaignTransaction: true,
      invitationActionsTransactional: true,
      campaignArchiveTransactional: true,
      campaignLifecycleEnforced: true,
      invitationsSentDryRun: 3,
      candidateSessionLocked: true,
      candidateCreditsCharged: 0,
      closedCampaignStartStatus: blockedStart.response.status,
      auditRecorded: true,
      scheduleRecorded: true,
      aiUsageManagement: true,
      deepseekBalanceLive: true,
      paymentManagement: true,
      creditAdjustmentAtomic: true,
      creditAdjustmentIdempotent: true,
      apiLogManagement: true,
      apiLogSecurityRedaction: true,
      apiLogTtlDays: 7,
    })
  );
} finally {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const scopedUsers = await users
    .find({ username: { $regex: `^${prefix}` } })
    .project({ _id: 1, email: 1, role: 1 })
    .toArray();
  const scopedIds = scopedUsers.map((user) => user._id);
  const scopedCampaigns = await campaigns
    .find({ recruiterId: { $in: scopedIds } })
    .project({ _id: 1 })
    .toArray();
  const scopedCampaignIds = scopedCampaigns.map((campaign) => campaign._id);
  const scopedInvitations = await invitations
    .find({
      $or: [
        { recruiterId: { $in: scopedIds } },
        { candidateId: { $in: scopedIds } },
        { campaignId: { $in: scopedCampaignIds } },
      ],
    })
    .project({ _id: 1 })
    .toArray();
  const testSessions = await sessions
    .find(
      { userId: { $in: scopedIds } },
      { projection: { ipAddress: 1 } }
    )
    .toArray();
  const admin = scopedUsers.find(
    (user) => user.email === accounts.admin.email
  );
  const rateLimitIdentities = scopedUsers.map((user) => [
    "login:account",
    user.email,
  ]);
  for (const session of testSessions) {
    if (session.ipAddress) {
      rateLimitIdentities.push(["login:ip", session.ipAddress]);
    }
  }
  if (admin) {
    rateLimitIdentities.push(["admin:role-change", admin._id.toString()]);
    rateLimitIdentities.push(["admin:credit-adjust", admin._id.toString()]);
    rateLimitIdentities.push([
      "admin:deepseek-balance",
      admin._id.toString(),
    ]);
  }
  const scopedRecruiters = scopedUsers.filter(
    (user) => user.role === "recruiter"
  );
  for (const recruiter of scopedRecruiters) {
    const recruiterIdentity = recruiter._id.toString();
    for (const scope of [
      "recruiter:create-campaign",
      "recruiter:add-candidates",
      "recruiter:update-campaign",
      "recruiter:invitation-action",
    ]) {
      rateLimitIdentities.push([scope, recruiterIdentity]);
    }
    for (const invitation of scopedInvitations) {
      rateLimitIdentities.push([
        "recruiter:invitation-action:item",
        `${recruiterIdentity}:${invitation._id}`,
      ]);
    }
  }
  const rateLimitKeys = rateLimitIdentities.map(([scope, identity]) =>
    createHash("sha256")
      .update(`${scope}:${identity}`)
      .digest("hex")
  );
  await Promise.all([
    apiRequestLogs.deleteMany({
      requestId: { $in: Array.from(observedRequestIds) },
    }),
    sessions.deleteMany({ userId: { $in: scopedIds } }),
    invitations.deleteMany({
      $or: [
        { recruiterId: { $in: scopedIds } },
        { candidateId: { $in: scopedIds } },
        { campaignId: { $in: scopedCampaignIds } },
      ],
    }),
    practices.deleteMany({
      $or: [
        { userId: { $in: scopedIds } },
        { recruiterId: { $in: scopedIds } },
        { recruitmentCampaignId: { $in: scopedCampaignIds } },
      ],
    }),
    campaigns.deleteMany({ _id: { $in: scopedCampaignIds } }),
    creditLogs.deleteMany({ userId: { $in: scopedIds } }),
    transactions.deleteMany({ userId: { $in: scopedIds } }),
    aiUsageEvents.deleteMany({ userId: { $in: scopedIds } }),
    db
      .collection("securityratelimits")
      .deleteMany({ key: { $in: rateLimitKeys } }),
    auditLogs.deleteMany({
      $or: [
        { actorId: { $in: scopedIds } },
        { targetId: { $in: scopedIds.map((id) => id.toString()) } },
        {
          targetId: {
            $in: scopedCampaignIds.map((id) => id.toString()),
          },
        },
      ],
    }),
  ]);
  await users.deleteMany({ _id: { $in: scopedIds } });
  await eventConnection.close();
  await mongoose.disconnect();
}
