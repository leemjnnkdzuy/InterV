import type { Types } from "mongoose";

export type ApiLogOutcome =
  | "SUCCESS"
  | "CLIENT_ERROR"
  | "SERVER_ERROR"
  | "UNHANDLED_ERROR";

export interface IApiRequestLog {
  _id: Types.ObjectId;
  requestId: string;
  source: "next-api";
  method: string;
  path: string;
  routeGroup: string;
  queryKeys: string[];
  statusCode: number;
  durationMs: number;
  outcome: ApiLogOutcome;
  isSlow: boolean;
  slowThresholdMsSnapshot: number;
  actorId?: Types.ObjectId;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  retryAfterSeconds?: number;
  errorType?: string;
  createdAt: Date;
}

export interface IApiLogSetting {
  _id: Types.ObjectId;
  key: "api-logs";
  retentionDays: number;
  slowThresholdMs: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
