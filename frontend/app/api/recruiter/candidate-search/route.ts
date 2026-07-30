import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/app/lib/ServerSecurity";
import User from "@/app/models/User";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["recruiter"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const query = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .toLowerCase()
      .slice(0, 100);
    if (query.length < 2) {
      return NextResponse.json({ success: true, candidates: [] });
    }
    await connectDB();
    await enforceRateLimit(
      "recruiter:candidate-search",
      authorization.principal.payload.userId,
      300,
      60 * 60 * 1000
    );
    const regex = new RegExp(escapeRegExp(query), "i");
    const candidates = await User.find({
      role: "user",
      isActive: true,
      isVerified: true,
      $or: [{ email: regex }, { username: regex }],
    })
      .select("username email avatar")
      .sort({ email: 1 })
      .limit(12)
      .lean();
    return NextResponse.json({
      success: true,
      candidates: candidates.map((candidate) => ({
        id: candidate._id.toString(),
        username: candidate.username,
        email: candidate.email,
        avatar: candidate.avatar,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn tìm kiếm quá nhanh" },
        rateLimitResponse(error)
      );
    }
    console.error("GET /api/recruiter/candidate-search error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tìm ứng viên" },
      { status: 500 }
    );
  }
}
