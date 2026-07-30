import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import type { AppRole } from "@/app/types";

const ROLES = new Set<AppRole>(["user", "recruiter", "admin"]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }

    const page = Math.max(
      1,
      Math.min(10_000, Number(request.nextUrl.searchParams.get("page")) || 1)
    );
    const limit = Math.max(
      10,
      Math.min(100, Number(request.nextUrl.searchParams.get("limit")) || 20)
    );
    const query = (request.nextUrl.searchParams.get("q") || "")
      .trim()
      .slice(0, 100);
    const role = request.nextUrl.searchParams.get("role") || "all";
    const status = request.nextUrl.searchParams.get("status") || "all";
    if (
      (role !== "all" && !ROLES.has(role as AppRole)) ||
      !["all", "active", "inactive"].includes(status)
    ) {
      return NextResponse.json(
        { success: false, message: "Bộ lọc không hợp lệ" },
        { status: 400 }
      );
    }

    const filter: Record<string, unknown> = {};
    if (role !== "all") {
      filter.role = role;
    }
    if (status !== "all") {
      filter.isActive = status === "active";
    }
    if (query) {
      const regex = new RegExp(escapeRegExp(query), "i");
      filter.$or = [{ username: regex }, { email: regex }];
    }

    await connectDB();
    const [users, total, roleCounts] = await Promise.all([
      User.find(filter)
        .select(
          "username email role avatar isVerified isActive credits createdAt updatedAt"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.aggregate<{ _id: AppRole; count: number }>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isActive: user.isActive,
        credits: user.credits || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      counts: Object.fromEntries(
        roleCounts.map((item) => [item._id || "user", item.count])
      ),
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách người dùng" },
      { status: 500 }
    );
  }
}
