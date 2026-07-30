import type { AppRole } from "@/app/types";

export function roleHomePath(role: AppRole | string | null | undefined) {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "recruiter") {
    return "/recruiter";
  }
  return "/";
}
