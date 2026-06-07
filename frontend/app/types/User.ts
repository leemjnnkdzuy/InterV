import { Document } from "mongoose";
import { ISocialLink } from "./SocialLink";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  avatar?: string;
  dob?: Date;
  socialLinks?: ISocialLink[];
  isVerified: boolean;
  isActive: boolean;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
