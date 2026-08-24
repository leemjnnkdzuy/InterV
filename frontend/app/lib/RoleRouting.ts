import type { AppRole, User } from "@/app/types";

export function normalizeAppRole(role: AppRole | string | null | undefined): AppRole {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
  if (normalizedRole === "admin") {
    return "admin";
  }
  if (normalizedRole === "recruiter") {
    return "recruiter";
  }
  return "user";
}

export function roleHomePath(role: AppRole | string | null | undefined) {
  const normalizedRole = normalizeAppRole(role);
  if (normalizedRole === "admin") {
    return "/admin";
  }
  if (normalizedRole === "recruiter") {
    return "/recruiter";
  }
  return "/";
}

export function getUserLandingPath(user: Partial<User> | null | undefined): string {
  if (!user) return "/";
  const normalizedRole = normalizeAppRole(user.role);
  if (normalizedRole === "admin") {
    return "/admin";
  }
  if (normalizedRole === "recruiter") {
    return "/recruiter";
  }
  if (user.isOnboarded === false) {
    return "/onboarding";
  }
  return "/";
}
