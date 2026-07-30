import type { AppRole } from "@/app/types";

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
