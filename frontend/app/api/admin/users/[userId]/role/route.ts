import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { recordAdminAudit } from "@/app/lib/AdminAudit";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import RecruitmentInvitation from "@/app/models/RecruitmentInvitation";
import Session from "@/app/models/Session";
import User from "@/app/models/User";
import type { AppRole } from "@/app/types";

const ROLES = new Set<AppRole>(["user", "recruiter", "admin"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    const actor = authorization.principal;
    const { userId } = await params;
    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, message: "ID người dùng không hợp lệ" },
        { status: 400 }
      );
    }
    if (userId === actor.payload.userId) {
      return NextResponse.json(
        { success: false, message: "Không thể tự thay đổi quyền của chính mình" },
        { status: 409 }
      );
    }

    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    const role = typeof body.role === "string" ? body.role : "";
    if (!ROLES.has(role as AppRole)) {
      return NextResponse.json(
        { success: false, message: "Vai trò không hợp lệ" },
        { status: 400 }
      );
    }

    await connectDB();
    await enforceRateLimit(
      "admin:role-change",
      actor.payload.userId,
      100,
      60 * 60 * 1000
    );
    const dbSession = await mongoose.startSession();
    let updatedUser:
      | {
          id: string;
          username: string;
          email: string;
          role: AppRole;
          isActive: boolean;
        }
      | undefined;
    let cancelledInvitationCount = 0;
    try {
      await dbSession.withTransaction(async () => {
        const target = await User.findById(userId)
          .select("username email role isActive isVerified")
          .session(dbSession);
        if (!target) {
          throw new Error("USER_NOT_FOUND");
        }
        if (!target.isActive && role === "recruiter") {
          throw new Error("INACTIVE_RECRUITER");
        }
        if (!target.isVerified && role !== "user") {
          throw new Error("UNVERIFIED_PRIVILEGED_USER");
        }
        if (target.role === role) {
          updatedUser = {
            id: target._id.toString(),
            username: target.username,
            email: target.email,
            role: target.role,
            isActive: target.isActive,
          };
          return;
        }
        if (target.role === "admin" && role !== "admin") {
          const activeAdminCount = await User.countDocuments({
            role: "admin",
            isActive: true,
          }).session(dbSession);
          if (activeAdminCount <= 1) {
            throw new Error("LAST_ADMIN");
          }
        }

        const previousRole = target.role;
        target.role = role as AppRole;
        await target.save({ session: dbSession });
        await Session.updateMany(
          { userId: target._id, isActive: true },
          { $set: { isActive: false } },
          { session: dbSession }
        );
        if (role !== "user") {
          const cancelledInvitations =
            await RecruitmentInvitation.updateMany(
              {
                candidateId: target._id,
                status: { $in: ["INVITED", "VIEWED"] },
              },
              { $set: { status: "CANCELLED" } },
              { session: dbSession }
            );
          cancelledInvitationCount =
            cancelledInvitations.modifiedCount;
        }
        await recordAdminAudit({
          request,
          actorId: actor.payload.userId,
          actorRole: actor.user.role,
          action: "USER_ROLE_CHANGED",
          targetType: "User",
          targetId: target._id.toString(),
          summary: `Đổi vai trò ${target.username} từ ${previousRole} thành ${role}`,
          changes: {
            previousRole,
            role,
            cancelledInvitationCount,
          },
          session: dbSession,
        });
        updatedUser = {
          id: target._id.toString(),
          username: target.username,
          email: target.email,
          role: target.role,
          isActive: target.isActive,
        };
      });
    } finally {
      await dbSession.endSession();
    }

    return NextResponse.json({
      success: true,
      message:
        "Đã cập nhật vai trò. Các phiên đăng nhập cũ của người dùng đã được thu hồi.",
      user: updatedUser,
      cancelledInvitationCount,
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn thao tác quá nhanh" },
        rateLimitResponse(error)
      );
    }
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu quá lớn" },
        { status: 413 }
      );
    }
    const message = error instanceof Error ? error.message : "";
    const mapped: Record<string, [string, number]> = {
      USER_NOT_FOUND: ["Không tìm thấy người dùng", 404],
      LAST_ADMIN: ["Hệ thống phải còn ít nhất một quản trị viên đang hoạt động", 409],
      INACTIVE_RECRUITER: ["Hãy mở khóa tài khoản trước khi cấp quyền nhà tuyển dụng", 409],
      UNVERIFIED_PRIVILEGED_USER: [
        "Chỉ có thể cấp quyền đặc biệt cho tài khoản đã xác minh",
        409,
      ],
    };
    if (mapped[message]) {
      return NextResponse.json(
        { success: false, message: mapped[message][0] },
        { status: mapped[message][1] }
      );
    }
    console.error("PATCH /api/admin/users/[userId]/role error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật vai trò" },
      { status: 500 }
    );
  }
}
