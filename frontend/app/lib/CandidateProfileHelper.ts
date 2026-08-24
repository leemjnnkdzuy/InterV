import { IUser } from "@/app/types";

/**
 * Formats the user's onboarding profile information into a concise, structured
 * background summary to be supplied to AI (DeepSeek) during interview generation,
 * opening turn acknowledgement, and assessment.
 */
export function formatCandidateOnboardingProfile(
  user?: Partial<IUser> | null
): string {
  if (!user) return "";

  const sections: string[] = [];

  // Basic Information & Target
  const introParts: string[] = [];
  if (user.fullName?.trim()) {
    introParts.push(`- Họ và tên: ${user.fullName.trim()}`);
  }
  if (user.headline?.trim()) {
    introParts.push(`- Giới thiệu / Tiêu đề: ${user.headline.trim()}`);
  }
  if (user.targetRole?.trim()) {
    introParts.push(`- Vị trí mục tiêu: ${user.targetRole.trim()}`);
  }
  if (user.targetIndustry?.trim()) {
    introParts.push(`- Ngành nghề: ${user.targetIndustry.trim()}`);
  }
  if (introParts.length > 0) {
    sections.push(`### Thông tin cá nhân & Định hướng:\n${introParts.join("\n")}`);
  }

  // Skills
  if (Array.isArray(user.skills) && user.skills.length > 0) {
    const validSkills = user.skills
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim());
    if (validSkills.length > 0) {
      sections.push(`### Kỹ năng chuyên môn:\n${validSkills.join(", ")}`);
    }
  }

  // Work Experience
  if (Array.isArray(user.workExperience) && user.workExperience.length > 0) {
    const expLines: string[] = [];
    for (const exp of user.workExperience) {
      if (!exp || typeof exp !== "object") continue;
      const role = exp.role?.trim() || "Chuyên viên";
      const company = exp.company?.trim() || "Doanh nghiệp";
      const duration = exp.duration?.trim() ? ` (${exp.duration.trim()})` : "";
      const desc = exp.description?.trim() ? `: ${exp.description.trim()}` : "";
      expLines.push(`- ${role} tại ${company}${duration}${desc}`);
    }
    if (expLines.length > 0) {
      sections.push(`### Kinh nghiệm làm việc:\n${expLines.join("\n")}`);
    }
  }

  // Education
  if (Array.isArray(user.education) && user.education.length > 0) {
    const eduLines: string[] = [];
    for (const edu of user.education) {
      if (!edu || typeof edu !== "object") continue;
      const school = edu.school?.trim();
      if (!school) continue;
      const major = edu.major?.trim() ? ` - Chuyên ngành: ${edu.major.trim()}` : "";
      const degree = edu.degree?.trim() ? ` [${edu.degree.trim()}]` : "";
      const years =
        edu.startYear || edu.endYear
          ? ` (${edu.startYear || "?"} - ${edu.endYear || "Hiện tại"})`
          : "";
      eduLines.push(`- ${school}${major}${degree}${years}`);
    }
    if (eduLines.length > 0) {
      sections.push(`### Học vấn & Bằng cấp:\n${eduLines.join("\n")}`);
    }
  }

  return sections.join("\n\n").trim();
}
