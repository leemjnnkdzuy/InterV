import "server-only";

import mongoose, { type ClientSession, type Types } from "mongoose";

import connectDB from "@/app/lib/ConnectDB";
import { normalizeEmail } from "@/app/lib/ServerSecurity";
import { QUESTION_CREDIT_COST } from "@/app/lib/PracticeBilling";
import { publishCreditUpdated } from "@/app/lib/CreditEvents";
import CreditLog from "@/app/models/CreditLog";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import User from "@/app/models/User";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYMENT_TYPES = new Set([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
]);
const WORK_MODES = new Set(["ONSITE", "HYBRID", "REMOTE"]);
const LANGUAGES = new Set(["vi-VN", "en-US", "zh-CN"]);

export interface RecruitmentCampaignInput {
  title: string;
  jobTitle: string;
  department: string;
  industry: string;
  employmentType: string;
  workMode: string;
  location: string;
  jobDescription: string;
  topic: string;
  language: string;
  voiceId: string;
  difficulty: string;
  questionCount: number;
  maxAttempts: number;
  startsAt?: Date;
  endsAt: Date;
  invitationMessage: string;
  candidateEmails: string[];
}

type ValidationResult =
  | { valid: true; data: RecruitmentCampaignInput }
  | { valid: false; message: string };

function boundedString(
  value: unknown,
  maximum: number,
  minimum = 0
): string | null {
  if (typeof value !== "string") {
    return minimum === 0 ? "" : null;
  }
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    return null;
  }
  return normalized;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function validateRecruitmentCampaignInput(
  body: Record<string, unknown>
): ValidationResult {
  const title = boundedString(body.title, 160, 3);
  const jobTitle = boundedString(body.jobTitle, 120, 2);
  const department = boundedString(body.department, 120);
  const industry = boundedString(body.industry, 120, 2);
  const location = boundedString(body.location, 200);
  const jobDescription = boundedString(body.jobDescription, 50_000, 20);
  const topic = boundedString(body.topic, 2_000);
  const voiceId = boundedString(body.voiceId, 120, 2);
  const difficulty = boundedString(body.difficulty, 80, 2);
  const invitationMessage = boundedString(body.invitationMessage, 2_000);
  const employmentType =
    typeof body.employmentType === "string" ? body.employmentType : "";
  const workMode = typeof body.workMode === "string" ? body.workMode : "";
  const language = typeof body.language === "string" ? body.language : "";
  const questionCount = Number(body.questionCount);
  const maxAttempts = Number(body.maxAttempts);
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);

  if (
    title === null ||
    jobTitle === null ||
    department === null ||
    industry === null ||
    location === null ||
    jobDescription === null ||
    topic === null ||
    voiceId === null ||
    difficulty === null ||
    invitationMessage === null
  ) {
    return {
      valid: false,
      message: "Nội dung chiến dịch thiếu hoặc vượt quá giới hạn cho phép",
    };
  }
  if (
    !EMPLOYMENT_TYPES.has(employmentType) ||
    !WORK_MODES.has(workMode) ||
    !LANGUAGES.has(language)
  ) {
    return {
      valid: false,
      message: "Loại công việc, hình thức hoặc ngôn ngữ không hợp lệ",
    };
  }
  if (
    !Number.isInteger(questionCount) ||
    questionCount < 5 ||
    questionCount > 25 ||
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1
  ) {
    return {
      valid: false,
      message: "Số câu hỏi hoặc số lượt làm không hợp lệ (tối thiểu 1 lượt)",
    };
  }
  if (!endsAt) {
    return { valid: false, message: "Hạn hoàn thành không hợp lệ" };
  }
  const now = Date.now();
  if (endsAt.getTime() <= now + 5 * 60 * 1000) {
    return {
      valid: false,
      message: "Hạn hoàn thành phải cách thời điểm hiện tại ít nhất 5 phút",
    };
  }
  if (endsAt.getTime() > now + 366 * 24 * 60 * 60 * 1000) {
    return {
      valid: false,
      message: "Chiến dịch không thể kéo dài quá một năm",
    };
  }
  if (startsAt && startsAt.getTime() >= endsAt.getTime()) {
    return {
      valid: false,
      message: "Thời gian bắt đầu phải trước hạn hoàn thành",
    };
  }
  if (!Array.isArray(body.candidateEmails)) {
    return { valid: false, message: "Danh sách ứng viên là bắt buộc" };
  }
  const candidateEmails = Array.from(
    new Set(body.candidateEmails.map(normalizeEmail).filter(Boolean))
  );
  if (
    candidateEmails.length < 1 ||
    candidateEmails.length > 50 ||
    candidateEmails.some((email) => !EMAIL_PATTERN.test(email))
  ) {
    return {
      valid: false,
      message: "Chọn từ 1 đến 50 email ứng viên hợp lệ",
    };
  }

  return {
    valid: true,
    data: {
      title,
      jobTitle,
      department,
      industry,
      employmentType,
      workMode,
      location,
      jobDescription,
      topic,
      language,
      voiceId,
      difficulty,
      questionCount,
      maxAttempts,
      startsAt,
      endsAt,
      invitationMessage,
      candidateEmails,
    },
  };
}

interface EligibleCandidate {
  _id: Types.ObjectId;
  username: string;
  email: string;
}

export async function resolveEligibleCandidates(candidateEmails: string[]) {
  await connectDB();
  const candidates = await User.find({
    email: { $in: candidateEmails },
    role: "user",
    isActive: true,
    isVerified: true,
  })
    .select("_id username email")
    .lean<EligibleCandidate[]>();
  const candidateMap = new Map(
    candidates.map((candidate) => [candidate.email, candidate])
  );
  return {
    candidates: candidateEmails
      .map((email) => candidateMap.get(email))
      .filter((candidate): candidate is EligibleCandidate => Boolean(candidate)),
    invalidEmails: candidateEmails.filter((email) => !candidateMap.has(email)),
  };
}

function invitationDocuments(input: {
  recruiterId: string;
  campaignId: Types.ObjectId;
  campaign: RecruitmentCampaignInput;
  candidates: EligibleCandidate[];
}) {
  return input.candidates.map((candidate) => {
    const practiceSessionId = new mongoose.Types.ObjectId();
    const invitationId = new mongoose.Types.ObjectId();
    return {
      practiceSession: {
        _id: practiceSessionId,
        userId: candidate._id,
        source: "recruitment",
        recruitmentCampaignId: input.campaignId,
        recruitmentInvitationId: invitationId,
        recruiterId: input.recruiterId,
        scheduledAt: input.campaign.startsAt,
        expiresAt: input.campaign.endsAt,
        maxAttempts: input.campaign.maxAttempts,
        lockedConfig: true,
        title: input.campaign.title,
        jobDescription: input.campaign.jobDescription,
        topic: input.campaign.topic,
        industry: input.campaign.industry,
        language: input.campaign.language,
        voiceId: input.campaign.voiceId,
        difficulty: input.campaign.difficulty,
        questionCount: input.campaign.questionCount,
        tags: [
          "Tuyển dụng",
          input.campaign.industry,
          input.campaign.jobTitle,
        ],
        attemptCount: 0,
        highestScore: 0,
      },
      invitation: {
        _id: invitationId,
        campaignId: input.campaignId,
        recruiterId: input.recruiterId,
        candidateId: candidate._id,
        practiceSessionId,
        candidateEmail: candidate.email,
        status: "INVITED",
        emailStatus: "PENDING",
        emailAttempts: 0,
        invitedAt: new Date(),
        expiresAt: input.campaign.endsAt,
      },
    };
  });
}

async function insertInvitationDocuments(
  documents: ReturnType<typeof invitationDocuments>,
  session: ClientSession
) {
  await PracticeSession.insertMany(
    documents.map((document) => document.practiceSession),
    { session }
  );
  await RecruitmentInvitation.insertMany(
    documents.map((document) => document.invitation),
    { session }
  );
}

export type CreateCampaignResult =
  | {
      ok: true;
      campaignId: string;
      invitationIds: string[];
      chargedCredits: number;
      remainingCredits: number;
    }
  | {
      ok: false;
      code: "INSUFFICIENT_CREDITS";
      requiredCredits: number;
      balanceCredits: number;
    };

export async function createRecruitmentCampaign(input: {
  recruiterId: string;
  campaign: RecruitmentCampaignInput;
  candidates: EligibleCandidate[];
}): Promise<CreateCampaignResult> {
  await connectDB();
  const campaignId = new mongoose.Types.ObjectId();
  const costPerCandidate = input.campaign.questionCount * QUESTION_CREDIT_COST;
  const requiredCredits = input.candidates.length * costPerCandidate;

  const documents = invitationDocuments({
    recruiterId: input.recruiterId,
    campaignId,
    campaign: input.campaign,
    candidates: input.candidates,
  });

  let result: CreateCampaignResult | undefined;

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // 1. Check and deduct credits from recruiter atomically
      const recruiter = await User.findOneAndUpdate(
        {
          _id: input.recruiterId,
          isActive: true,
          credits: { $gte: requiredCredits },
        },
        { $inc: { credits: -requiredCredits } },
        { returnDocument: "after", session: dbSession }
      ).select("credits");

      if (!recruiter) {
        const currentRecruiter = await User.findById(input.recruiterId)
          .select("credits")
          .session(dbSession)
          .lean();
        result = {
          ok: false,
          code: "INSUFFICIENT_CREDITS",
          requiredCredits,
          balanceCredits: currentRecruiter?.credits || 0,
        };
        return;
      }

      // 2. Create campaign
      await RecruitmentCampaign.create(
        [
          {
            _id: campaignId,
            recruiterId: input.recruiterId,
            title: input.campaign.title,
            jobTitle: input.campaign.jobTitle,
            department: input.campaign.department,
            industry: input.campaign.industry,
            employmentType: input.campaign.employmentType,
            workMode: input.campaign.workMode,
            location: input.campaign.location,
            jobDescription: input.campaign.jobDescription,
            topic: input.campaign.topic,
            language: input.campaign.language,
            voiceId: input.campaign.voiceId,
            difficulty: input.campaign.difficulty,
            questionCount: input.campaign.questionCount,
            maxAttempts: input.campaign.maxAttempts,
            startsAt: input.campaign.startsAt,
            endsAt: input.campaign.endsAt,
            invitationMessage: input.campaign.invitationMessage,
            status: "ACTIVE",
          },
        ],
        { session: dbSession }
      );

      // 3. Insert invitations & practice sessions
      await insertInvitationDocuments(documents, dbSession);

      // 4. Log credit transaction
      await CreditLog.create(
        [
          {
            userId: input.recruiterId,
            credits: -requiredCredits,
            action: "RECRUITMENT_CAMPAIGN",
            referenceId: campaignId.toString(),
            description: `Tạo chiến dịch phỏng vấn "${input.campaign.title}" (${input.candidates.length} ứng viên × ${costPerCandidate} Credits)`,
            metadata: {
              campaignId: campaignId.toString(),
              candidateCount: input.candidates.length,
              questionCount: input.campaign.questionCount,
              costPerCandidate,
              totalCredits: requiredCredits,
            },
          },
        ],
        { session: dbSession }
      );

      result = {
        ok: true,
        campaignId: campaignId.toString(),
        invitationIds: documents.map((document) =>
          document.invitation._id.toString()
        ),
        chargedCredits: requiredCredits,
        remainingCredits: recruiter.credits,
      };
    });
  } finally {
    await dbSession.endSession();
  }

  if (!result) {
    throw new Error("Recruitment campaign transaction returned no result");
  }

  if (result.ok) {
    publishCreditUpdated({
      userId: input.recruiterId,
      balance: result.remainingCredits,
      delta: -result.chargedCredits,
      reason: "RECRUITMENT_CAMPAIGN",
      referenceId: result.campaignId,
    });
  }

  return result;
}

export type AddCandidatesResult =
  | { ok: false; code: "CAMPAIGN_NOT_FOUND" }
  | {
      ok: false;
      code: "INVALID_CANDIDATES";
      invalidEmails: string[];
    }
  | {
      ok: false;
      code: "DUPLICATE_CANDIDATES";
      duplicateEmails: string[];
    }
  | {
      ok: false;
      code: "INSUFFICIENT_CREDITS";
      requiredCredits: number;
      balanceCredits: number;
    }
  | {
      ok: true;
      invitationIds: string[];
      chargedCredits: number;
      remainingCredits: number;
    };

export async function addCandidatesToCampaign(input: {
  recruiterId: string;
  campaignId: string;
  candidateEmails: string[];
}): Promise<AddCandidatesResult> {
  await connectDB();
  let result: AddCandidatesResult | undefined;
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const campaign = await RecruitmentCampaign.findOne({
        _id: input.campaignId,
        recruiterId: input.recruiterId,
        status: { $in: ["DRAFT", "ACTIVE"] },
      })
        .session(dbSession)
        .lean();
      if (!campaign) {
        result = { ok: false, code: "CAMPAIGN_NOT_FOUND" };
        return;
      }

      const candidates = await User.find({
        email: { $in: input.candidateEmails },
        role: "user",
        isActive: true,
        isVerified: true,
      })
        .select("_id username email")
        .session(dbSession)
        .lean<EligibleCandidate[]>();

      const candidateMap = new Map(
        candidates.map((candidate) => [candidate.email, candidate])
      );
      const invalidEmails = input.candidateEmails.filter(
        (email) => !candidateMap.has(email)
      );
      if (invalidEmails.length > 0) {
        result = {
          ok: false,
          code: "INVALID_CANDIDATES",
          invalidEmails,
        };
        return;
      }
      const orderedCandidates = input.candidateEmails.map(
        (email) => candidateMap.get(email) as EligibleCandidate
      );
      const existing = await RecruitmentInvitation.find({
        campaignId: campaign._id,
        candidateId: {
          $in: orderedCandidates.map((candidate) => candidate._id),
        },
      })
        .select("candidateId")
        .session(dbSession)
        .lean();
      const existingIds = new Set(
        existing.map((invitation) => invitation.candidateId.toString())
      );
      const duplicateEmails = orderedCandidates
        .filter((candidate) =>
          existingIds.has(candidate._id.toString())
        )
        .map((candidate) => candidate.email);
      if (duplicateEmails.length > 0) {
        result = {
          ok: false,
          code: "DUPLICATE_CANDIDATES",
          duplicateEmails,
        };
        return;
      }

      // Check and deduct credits for additional candidates
      const costPerCandidate = campaign.questionCount * QUESTION_CREDIT_COST;
      const requiredCredits = orderedCandidates.length * costPerCandidate;

      const recruiter = await User.findOneAndUpdate(
        {
          _id: input.recruiterId,
          isActive: true,
          credits: { $gte: requiredCredits },
        },
        { $inc: { credits: -requiredCredits } },
        { returnDocument: "after", session: dbSession }
      ).select("credits");

      if (!recruiter) {
        const currentRecruiter = await User.findById(input.recruiterId)
          .select("credits")
          .session(dbSession)
          .lean();
        result = {
          ok: false,
          code: "INSUFFICIENT_CREDITS",
          requiredCredits,
          balanceCredits: currentRecruiter?.credits || 0,
        };
        return;
      }

      const campaignInput: RecruitmentCampaignInput = {
        title: campaign.title,
        jobTitle: campaign.jobTitle,
        department: campaign.department || "",
        industry: campaign.industry,
        employmentType: campaign.employmentType,
        workMode: campaign.workMode,
        location: campaign.location || "",
        jobDescription: campaign.jobDescription,
        topic: campaign.topic || "",
        language: campaign.language,
        voiceId: campaign.voiceId,
        difficulty: campaign.difficulty,
        questionCount: campaign.questionCount,
        maxAttempts: campaign.maxAttempts,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        invitationMessage: campaign.invitationMessage || "",
        candidateEmails: input.candidateEmails,
      };
      const documents = invitationDocuments({
        recruiterId: input.recruiterId,
        campaignId: campaign._id,
        campaign: campaignInput,
        candidates: orderedCandidates,
      });
      await insertInvitationDocuments(documents, dbSession);

      await CreditLog.create(
        [
          {
            userId: input.recruiterId,
            credits: -requiredCredits,
            action: "RECRUITMENT_CAMPAIGN",
            referenceId: campaign._id.toString(),
            description: `Thêm ${orderedCandidates.length} ứng viên vào chiến dịch "${campaign.title}" (${orderedCandidates.length} ứng viên × ${costPerCandidate} Credits)`,
            metadata: {
              campaignId: campaign._id.toString(),
              candidateCount: orderedCandidates.length,
              questionCount: campaign.questionCount,
              costPerCandidate,
              totalCredits: requiredCredits,
            },
          },
        ],
        { session: dbSession }
      );

      result = {
        ok: true,
        invitationIds: documents.map((document) =>
          document.invitation._id.toString()
        ),
        chargedCredits: requiredCredits,
        remainingCredits: recruiter.credits,
      };
    });
  } catch (error: unknown) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: unknown }).code)
        : 0;
    if (errorCode === 11_000) {
      result = {
        ok: false,
        code: "DUPLICATE_CANDIDATES",
        duplicateEmails: input.candidateEmails,
      };
    } else {
      throw error;
    }
  } finally {
    await dbSession.endSession();
  }
  if (!result) {
    throw new Error("Recruitment candidate transaction returned no result");
  }

  if (result.ok) {
    publishCreditUpdated({
      userId: input.recruiterId,
      balance: result.remainingCredits,
      delta: -result.chargedCredits,
      reason: "RECRUITMENT_CAMPAIGN",
      referenceId: input.campaignId,
    });
  }

  return result;
}
