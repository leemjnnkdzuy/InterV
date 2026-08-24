import type { SocialLink } from "./Auth";
import type { UserGender, UserEducation, UserExperience, UserCvFile } from "./User";

export interface ProfilePageProps {
  targetUsername?: string;
}

export interface ProfileStats {
  totalInterviews: number;
  averageScore: number;
  totalDurationSec: number;
  ratings?: {
    communication: number;
    knowledge: number;
    problemSolving: number;
    confidence: number;
  };
}

export interface ProfileUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  avatar?: string;
  dob?: string;
  socialLinks?: SocialLink[];
  credits?: number;
  fullName?: string;
  gender?: UserGender;
  headline?: string;
  targetRole?: string;
  targetIndustry?: string;
  skills?: string[];
  education?: UserEducation[];
  workExperience?: UserExperience[];
  cvFile?: UserCvFile;
  isOnboarded?: boolean;
  stats?: ProfileStats;
  createdAt: string;
}

export interface UserProfileUpdateResponse {
  success: boolean;
  message?: string;
  user: ProfileUser;
}

export interface OnboardingData {
  fullName?: string;
  dob?: Date | string;
  birthYear?: number;
  gender?: UserGender;
  headline?: string;
  targetRole?: string;
  targetIndustry?: string;
  skills?: string[];
  education?: UserEducation[];
  workExperience?: UserExperience[];
  cvFile?: UserCvFile | null;
}

export interface OnboardingResponse {
  success: boolean;
  message?: string;
  user?: ProfileUser;
}

export interface AuthSessionData {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

export interface UserServiceResponse {
  success: boolean;
  message?: string;
}

export interface UserSessionsResponse extends UserServiceResponse {
  sessions: AuthSessionData[];
}

export interface UsernameCheckResponse extends UserServiceResponse {
  available?: boolean;
}

export interface UsernameChangeResponse extends UserServiceResponse {
  user?: ProfileUser;
}

export type PasswordChangeResponse = UserServiceResponse;
export type EmailChangeResponse = UserServiceResponse;

export interface UsernameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { username: string } | null;
  refreshUser: () => Promise<void>;
}

export interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { email: string } | null;
  refreshUser: () => Promise<void>;
}
