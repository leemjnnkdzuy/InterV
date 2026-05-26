import mongoose, { Document } from "mongoose";

export interface ISocialLink {
  platform: string;
  usernameOrUrl: string;
}

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

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  deviceInfo: string;
  ipAddress: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegisterPin extends Document {
  email: string;
  username: string;
  password: string;
  pin: string;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFogetPasswordPin extends Document {
  email: string;
  pin: string;
  verified: boolean;
  failedAttempts: number;
  blockedUntil: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailChangePin extends Document {
  userId: mongoose.Types.ObjectId;
  currentEmailPin: string;
  currentEmailVerified: boolean;
  newEmail: string | null;
  newEmailPin: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  orderCode: number;
  amount: number;
  credits: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentLinkId: string;
  paymentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreditLog extends Document {
  userId: mongoose.Types.ObjectId;
  credits: number;
  action: "RECHARGE" | "AI_INTERVIEW" | "REGISTER_BONUS" | "ADMIN_ADJUST";
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
