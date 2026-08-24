import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import { authenticateRequest } from "@/app/lib/Auth";
import {
  readJsonBodyLimited,
  RequestBodyTooLargeError,
} from "@/app/lib/ServerSecurity";
import type { UserEducation, UserExperience, UserCvFile, UserGender } from "@/app/types";

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

function normalizeCvFile(val: unknown): UserCvFile | undefined {
  if (!val || typeof val !== "object") return undefined;
  const raw = val as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.slice(0, 200) : "";
  const size = typeof raw.size === "number" ? raw.size : 0;
  const data = typeof raw.data === "string" ? raw.data : "";
  if (!name && !data) return undefined;
  // Limit base64 CV data to 5MB max
  if (data && data.length > 7 * 1024 * 1024) return undefined;
  return {
    name,
    size,
    data,
    uploadedAt: new Date(),
  };
}

async function POSTHandler(request: NextRequest) {
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
      8 * 1024 * 1024
    )) as Record<string, unknown>;

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // 1. Personal info
    if (typeof body.fullName === "string") {
      user.fullName = body.fullName.trim().slice(0, 100);
    }

    if (body.dob !== undefined) {
      if (!body.dob) {
        user.dob = undefined;
      } else {
        const dobDate = new Date(body.dob as string);
        if (!Number.isNaN(dobDate.getTime())) {
          user.dob = dobDate;
        }
      }
    } else if (typeof body.birthYear === "number" && body.birthYear >= 1900 && body.birthYear <= new Date().getFullYear()) {
      user.dob = new Date(`${body.birthYear}-01-01T00:00:00.000Z`);
    }

    if (typeof body.gender === "string" && ["male", "female", "other", ""].includes(body.gender)) {
      user.gender = body.gender as UserGender;
    }

    if (typeof body.headline === "string") {
      user.headline = body.headline.trim().slice(0, 200);
    }

    // 2. Education & Experience & Skills
    if (body.education !== undefined) {
      user.education = normalizeEducation(body.education);
    }

    if (body.workExperience !== undefined) {
      user.workExperience = normalizeWorkExperience(body.workExperience);
    }

    if (body.skills !== undefined) {
      user.skills = normalizeSkills(body.skills);
    }

    // 3. Target Role & Industry
    if (typeof body.targetRole === "string") {
      user.targetRole = body.targetRole.trim().slice(0, 100);
    }

    if (typeof body.targetIndustry === "string") {
      user.targetIndustry = body.targetIndustry.trim().slice(0, 100);
    }

    // 4. CV file
    if (body.cvFile !== undefined) {
      user.cvFile = normalizeCvFile(body.cvFile);
    }

    // 5. Mark as completed onboarding
    user.isOnboarded = true;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Hoàn tất thiết lập hồ sơ onboarding thành công!",
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
        isOnboarded: true,
        credits: user.credits || 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("POST /api/users/onboarding error:", error);
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, message: "Dữ liệu hồ sơ hoặc CV quá lớn (tối đa 5MB)" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(POSTHandler);
export const PUT = withApiLogging(POSTHandler);
