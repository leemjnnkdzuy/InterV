import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";
import { SOCIAL_PLATFORMS } from "@/app/contants";
import type { ISocialLink } from "@/app/types";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_PLATFORMS = new Set(
  SOCIAL_PLATFORMS.map((platform) => platform.id)
);

function validImageDataUri(value: string): boolean {
  const match = /^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(
    value
  );
  if (!match) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) return false;
  if (match[1] === "png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (match[1] === "jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function normalizeSocialLinks(value: unknown): ISocialLink[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const links: ISocialLink[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const platform =
      "platform" in item ? String(item.platform || "").toLowerCase() : "";
    const usernameOrUrl =
      "usernameOrUrl" in item ? String(item.usernameOrUrl || "").trim() : "";
    if (
      !ALLOWED_PLATFORMS.has(platform) ||
      !usernameOrUrl ||
      usernameOrUrl.length > 300 ||
      /[\u0000-\u001f\u007f]/.test(usernameOrUrl) ||
      /^(javascript|data|vbscript):/i.test(usernameOrUrl)
    ) {
      return null;
    }
    if (/^https?:\/\//i.test(usernameOrUrl)) {
      try {
        const url = new URL(usernameOrUrl);
        if (!["http:", "https:"].includes(url.protocol)) return null;
      } catch {
        return null;
      }
    }
    links.push({ platform, usernameOrUrl });
  }
  return links;
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ" },
        { status: 401 }
      );
    }
    const body = (await readJsonBodyLimited(
      request,
      3 * 1024 * 1024
    )) as Record<string, unknown>;
    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    if (body.dob !== undefined) {
      if (!body.dob) {
        user.dob = undefined;
      } else {
        if (typeof body.dob !== "string" || body.dob.length > 40) {
          return NextResponse.json(
            { success: false, message: "Ngày sinh không hợp lệ" },
            { status: 400 }
          );
        }
        const dob = new Date(body.dob);
        const earliest = new Date("1900-01-01T00:00:00.000Z");
        if (
          Number.isNaN(dob.getTime()) ||
          dob < earliest ||
          dob > new Date()
        ) {
          return NextResponse.json(
            { success: false, message: "Ngày sinh không hợp lệ" },
            { status: 400 }
          );
        }
        user.dob = dob;
      }
    }

    if (body.avatar !== undefined) {
      if (typeof body.avatar !== "string" || !validImageDataUri(body.avatar)) {
        return NextResponse.json(
          {
            success: false,
            message: "Ảnh đại diện phải là PNG, JPEG hoặc WebP dưới 2 MB",
          },
          { status: 400 }
        );
      }
      user.avatar = body.avatar;
    }

    if (body.socialLinks !== undefined) {
      const links = normalizeSocialLinks(body.socialLinks);
      if (!links) {
        return NextResponse.json(
          { success: false, message: "Danh sách liên kết không hợp lệ" },
          { status: 400 }
        );
      }
      user.socialLinks = links;
    }

    await user.save();
    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "user",
        avatar: user.avatar,
        dob: user.dob,
        socialLinks: user.socialLinks || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("PUT /api/users/update error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu hồ sơ quá lớn" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
