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
import Session from "@/app/models/Session";
import User from "@/app/models/User";

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
        { success: false, message: "Không thể tự khóa tài khoản của chính mình" },
        { status: 409 }
      );
    }
    const body = (await readJsonBodyLimited(
      request,
      4 * 1024
    )) as Record<string, unknown>;
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Trạng thái không hợp lệ" },
        { status: 400 }
      );
    }
    const isActive = body.isActive;

    await connectDB();
    await enforceRateLimit(
      "admin:user-status",
      actor.payload.userId,
      100,
      60 * 60 * 1000
    );
    const dbSession = await mongoose.startSession();
    let result: { id: string; isActive: boolean } | undefined;
    try {
      await dbSession.withTransaction(async () => {
        const target = await User.findById(userId)
          .select("username role isActive")
          .session(dbSession);
        if (!target) {
          throw new Error("USER_NOT_FOUND");
        }
        if (target.isActive === isActive) {
          result = { id: target._id.toString(), isActive: target.isActive };
          return;
        }
        if (target.role === "admin" && isActive === false) {
          const activeAdminCount = await User.countDocuments({
            role: "admin",
            isActive: true,
          }).session(dbSession);
          if (activeAdminCount <= 1) {
            throw new Error("LAST_ADMIN");
          }
        }
        const previousStatus = target.isActive;
        target.isActive = isActive;
        await target.save({ session: dbSession });
        if (!isActive) {
          await Session.updateMany(
            { userId: target._id, isActive: true },
            { $set: { isActive: false } },
            { session: dbSession }
          );
        }
        await recordAdminAudit({
          request,
          actorId: actor.payload.userId,
          actorRole: actor.user.role,
          action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
          targetType: "User",
          targetId: target._id.toString(),
          summary: `${isActive ? "Mở khóa" : "Khóa"} tài khoản ${target.username}`,
          changes: { previousStatus, isActive },
          session: dbSession,
        });
        result = { id: target._id.toString(), isActive: target.isActive };
      });
    } finally {
      await dbSession.endSession();
    }
    return NextResponse.json({
      success: true,
      message: isActive
        ? "Đã mở khóa tài khoản"
        : "Đã khóa tài khoản và thu hồi các phiên đăng nhập",
      user: result,
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
    if (message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }
    if (message === "LAST_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động",
        },
        { status: 409 }
      );
    }
    console.error("PATCH /api/admin/users/[userId]/status error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật trạng thái tài khoản" },
      { status: 500 }
    );
  }
}
