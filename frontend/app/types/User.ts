import { Document } from "mongoose";
import { ISocialLink } from "./SocialLink";

export type AppRole = "user" | "recruiter" | "admin";
export type UserGender = "male" | "female" | "other" | "";

export interface UserEducation {
  school: string;
  major?: string;
  degree?: string;
  startYear?: number;
  endYear?: number;
}

export interface UserExperience {
  company: string;
  role: string;
  duration?: string;
  description?: string;
}

export interface UserCvFile {
  name: string;
  size: number;
  data?: string;
  uploadedAt?: Date | string;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: AppRole;
  avatar?: string;
  dob?: Date;
  socialLinks?: ISocialLink[];
  isVerified: boolean;
  isActive: boolean;
  credits: number;
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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
