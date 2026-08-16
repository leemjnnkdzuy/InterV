import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { withApiLogging } from "@/app/lib/ApiLogging";
import { authenticateRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { normalizeInterviewQuestionCount } from "@/app/lib/PracticeBilling";
import PracticeRun from "@/app/models/PracticeRun";
import PracticeSession from "@/app/models/PracticeSession";
import RecruitmentCampaign from "@/app/models/RecruitmentCampaign";
import User from "@/app/models/User";
import type {
  PracticeHistorySource,
  PracticeHistoryStatus,
} from "@/app/types";

interface HistorySession {
  _id: Types.ObjectId;
  source?: PracticeHistorySource;
  recruiterId?: Types.ObjectId;
  recruitmentCampaignId?: Types.ObjectId;
  title: string;
  industry?: string;
  difficulty?: string;
}

interface HistoryRun {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  status: PracticeHistoryStatus;
  questionCount?: number;
  answers?: unknown[];
  evaluation?: {
    score?: number;
    duration?: string;
    durationSec?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function GETHandler(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để xem lịch sử" },
        { status: 401 }
      );
    }

    const sourceParam = request.nextUrl.searchParams.get("source");
    const source: PracticeHistorySource | "all" =
      sourceParam === "practice" || sourceParam === "recruitment"
        ? sourceParam
        : "all";
    const page = positiveInteger(request.nextUrl.searchParams.get("page"), 1);
    const limit = Math.min(
      50,
      positiveInteger(request.nextUrl.searchParams.get("limit"), 20)
    );

    await connectDB();
    const userId = new Types.ObjectId(payload.userId);
    const sessions = await PracticeSession.find({ userId })
      .select(
        "source recruiterId recruitmentCampaignId title industry difficulty"
      )
      .lean<HistorySession[]>();

    const sessionById = new Map(
      sessions.map((session) => [session._id.toString(), session])
    );
    const allSessionIds = sessions.map((session) => session._id);
    const practiceSessionIds = sessions
      .filter((session) => (session.source || "practice") === "practice")
      .map((session) => session._id);
    const recruitmentSessionIds = sessions
      .filter((session) => session.source === "recruitment")
      .map((session) => session._id);
    const selectedSessionIds =
      source === "practice"
        ? practiceSessionIds
        : source === "recruitment"
          ? recruitmentSessionIds
          : allSessionIds;

    const baseFilter = { userId, sessionId: { $in: allSessionIds } };
    const selectedFilter = { userId, sessionId: { $in: selectedSessionIds } };

    const [total, practiceTotal, recruitmentTotal, completedTotal, filteredTotal] =
      await Promise.all([
        PracticeRun.countDocuments(baseFilter),
        PracticeRun.countDocuments({
          userId,
          sessionId: { $in: practiceSessionIds },
        }),
        PracticeRun.countDocuments({
          userId,
          sessionId: { $in: recruitmentSessionIds },
        }),
        PracticeRun.countDocuments({ ...baseFilter, status: "COMPLETED" }),
        PracticeRun.countDocuments(selectedFilter),
      ]);

    const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
    const safePage = Math.min(page, totalPages);
    const runs = await PracticeRun.find(selectedFilter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .select(
        "sessionId status questionCount answers evaluation createdAt updatedAt"
      )
      .lean<HistoryRun[]>();

    const visibleSessions = runs
      .map((run) => sessionById.get(run.sessionId.toString()))
      .filter((session): session is HistorySession => Boolean(session));
    const recruiterIds = Array.from(
      new Set(
        visibleSessions
          .map((session) => session.recruiterId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );
    const campaignIds = Array.from(
      new Set(
        visibleSessions
          .map((session) => session.recruitmentCampaignId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );

    const [recruiters, campaigns] = await Promise.all([
      recruiterIds.length
        ? User.find({ _id: { $in: recruiterIds } })
            .select("username")
            .lean<Array<{ _id: Types.ObjectId; username?: string }>>()
        : [],
      campaignIds.length
        ? RecruitmentCampaign.find({ _id: { $in: campaignIds } })
            .select("title jobTitle")
            .lean<
              Array<{
                _id: Types.ObjectId;
                title: string;
                jobTitle: string;
              }>
            >()
        : [],
    ]);
    const recruiterById = new Map(
      recruiters.map((recruiter) => [
        recruiter._id.toString(),
        recruiter.username || "Nhà tuyển dụng",
      ])
    );
    const campaignById = new Map(
      campaigns.map((campaign) => [campaign._id.toString(), campaign])
    );

    return NextResponse.json({
      success: true,
      items: runs.map((run) => {
        const session = sessionById.get(run.sessionId.toString());
        const campaign = session?.recruitmentCampaignId
          ? campaignById.get(session.recruitmentCampaignId.toString())
          : undefined;
        const durationSec = Math.max(
          0,
          Math.round(Number(run.evaluation?.durationSec) || 0)
        );

        return {
          id: run._id.toString(),
          sessionId: run.sessionId.toString(),
          source: session?.source || "practice",
          title: session?.title || "Buổi phỏng vấn",
          industry: session?.industry || "",
          difficulty: session?.difficulty || "",
          status: run.status,
          score:
            run.status === "COMPLETED"
              ? Math.round(Number(run.evaluation?.score) || 0)
              : undefined,
          duration: run.evaluation?.duration || "0 phút",
          durationSec,
          answeredCount: run.answers?.length || 0,
          questionCount: normalizeInterviewQuestionCount(run.questionCount),
          startedAt: run.createdAt.toISOString(),
          completedAt:
            run.status === "COMPLETED" ? run.updatedAt.toISOString() : undefined,
          recruiterName: session?.recruiterId
            ? recruiterById.get(session.recruiterId.toString())
            : undefined,
          campaignTitle: campaign?.title,
          jobTitle: campaign?.jobTitle,
        };
      }),
      stats: {
        total,
        practice: practiceTotal,
        recruitment: recruitmentTotal,
        completed: completedTotal,
      },
      pagination: {
        page: safePage,
        limit,
        total: filteredTotal,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/practice/history error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải lịch sử luyện tập" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
