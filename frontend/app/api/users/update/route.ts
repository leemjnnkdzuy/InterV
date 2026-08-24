import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";
import { SOCIAL_PLATFORMS } from "@/app/contants";
import type { ISocialLink, UserEducation, UserExperience, UserGender } from "@/app/types";
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

function normalizeSkills(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim().slice(0, 50))
    .filter((s) => s.length > 0)
    .slice(0, 30);
}

function normalizeEducation(val: unknown): UserEducation[] {
  if (!Array.isArray(val)) return [];
  const list: UserEducation[] = [];
  for (const item of val.slice(0, 10)) {
    if (typeof item !== "object" || item === null) continue;
    const school = String((item as { school?: unknown }).school || "").trim().slice(0, 150);
    if (!school) continue;
    const major = String((item as { major?: unknown }).major || "").trim().slice(0, 150);
    const degree = String((item as { degree?: unknown }).degree || "").trim().slice(0, 100);
    const startYear = typeof (item as { startYear?: unknown }).startYear === "number" ? (item as { startYear?: number }).startYear : undefined;
    const endYear = typeof (item as { endYear?: unknown }).endYear === "number" ? (item as { endYear?: number }).endYear : undefined;
    list.push({ school, major, degree, startYear, endYear });
  }
  return list;
}

function normalizeWorkExperience(val: unknown): UserExperience[] {
  if (!Array.isArray(val)) return [];
  const list: UserExperience[] = [];
  for (const item of val.slice(0, 10)) {
    if (typeof item !== "object" || item === null) continue;
    const company = String((item as { company?: unknown }).company || "").trim().slice(0, 150);
    const role = String((item as { role?: unknown }).role || "").trim().slice(0, 150);
    if (!company && !role) continue;
    const duration = String((item as { duration?: unknown }).duration || "").trim().slice(0, 100);
    const description = String((item as { description?: unknown }).description || "").trim().slice(0, 1000);
    list.push({
      company: company || "Chưa cập nhật",
      role: role || "Vị trí",
      duration,
      description,
    });
  }
  return list;
}

async function PUTHandler(request: NextRequest) {
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
      6 * 1024 * 1024
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

    if (typeof body.fullName === "string") {
      user.fullName = body.fullName.trim().slice(0, 100);
    }

    if (typeof body.gender === "string" && ["male", "female", "other", ""].includes(body.gender)) {
      user.gender = body.gender as UserGender;
    }

    if (typeof body.headline === "string") {
      user.headline = body.headline.trim().slice(0, 200);
    }

    if (typeof body.targetRole === "string") {
      user.targetRole = body.targetRole.trim().slice(0, 100);
    }

    if (typeof body.targetIndustry === "string") {
      user.targetIndustry = body.targetIndustry.trim().slice(0, 100);
    }

    if (body.skills !== undefined) {
      user.skills = normalizeSkills(body.skills);
    }

    if (body.education !== undefined) {
      user.education = normalizeEducation(body.education);
    }

    if (body.workExperience !== undefined) {
      user.workExperience = normalizeWorkExperience(body.workExperience);
    }

    if (body.cvFile !== undefined && typeof body.cvFile === "object" && body.cvFile !== null) {
      const raw = body.cvFile as Record<string, unknown>;
      const name = typeof raw.name === "string" ? raw.name.slice(0, 200) : "";
      const size = typeof raw.size === "number" ? raw.size : 0;
      const data = typeof raw.data === "string" ? raw.data : "";
      if (name || data) {
        user.cvFile = {
          name,
          size,
          data: data && data.length <= 7 * 1024 * 1024 ? data : "",
          uploadedAt: new Date(),
        };
      }
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
        fullName: user.fullName || "",
        gender: user.gender || "",
        headline: user.headline || "",
        targetRole: user.targetRole || "",
        targetIndustry: user.targetIndustry || "",
        skills: user.skills || [],
        education: user.education || [],
        workExperience: user.workExperience || [],
        cvFile: user.cvFile,
        isOnboarded: user.isOnboarded ?? false,
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

export const PUT = withApiLogging(PUTHandler);
