import { Model, Schema } from "mongoose";

import { getEventDBConnection } from "@/app/lib/ConnectEventDB";
import type { IApiRequestLog } from "@/app/types/ApiLog";

export const API_LOG_TTL_SECONDS = 7 * 24 * 60 * 60;

const apiRequestLogSchema = new Schema<IApiRequestLog>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      maxlength: 64,
    },
    source: {
      type: String,
      enum: ["next-api"],
      default: "next-api",
      required: true,
    },
    method: { type: String, required: true, maxlength: 12 },
    path: { type: String, required: true, maxlength: 500 },
    routeGroup: { type: String, required: true, maxlength: 80 },
    queryKeys: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) =>
          items.length <= 30 && items.every((item) => item.length <= 80),
        message: "queryKeys exceeds the allowed size",
      },
    },
    statusCode: { type: Number, required: true, min: 100, max: 599 },
    durationMs: { type: Number, required: true, min: 0 },
    outcome: {
      type: String,
      enum: [
        "SUCCESS",
        "CLIENT_ERROR",
        "SERVER_ERROR",
        "UNHANDLED_ERROR",
      ],
      required: true,
    },
    isSlow: { type: Boolean, required: true },
    slowThresholdMsSnapshot: { type: Number, required: true, min: 100 },
    actorId: { type: Schema.Types.ObjectId },
    sessionId: { type: String, maxlength: 64 },
    ipAddress: { type: String, required: true, maxlength: 64 },
    userAgent: { type: String, required: true, maxlength: 256 },
    requestSizeBytes: { type: Number, min: 0 },
    responseSizeBytes: { type: Number, min: 0 },
    retryAfterSeconds: { type: Number, min: 0 },
    errorType: { type: String, maxlength: 120 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  }
);

apiRequestLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: API_LOG_TTL_SECONDS }
);
apiRequestLogSchema.index({ createdAt: -1 });
apiRequestLogSchema.index({ outcome: 1, createdAt: -1 });
apiRequestLogSchema.index({ routeGroup: 1, createdAt: -1 });
apiRequestLogSchema.index({ isSlow: 1, createdAt: -1 });

export function getApiRequestLogModel(): Model<IApiRequestLog> {
  const connection = getEventDBConnection();
  return (
    (connection.models.ApiRequestLog as
      | Model<IApiRequestLog>
      | undefined) ||
    connection.model<IApiRequestLog>(
      "ApiRequestLog",
      apiRequestLogSchema
    )
  );
}
