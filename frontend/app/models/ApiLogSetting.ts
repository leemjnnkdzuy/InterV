import { Model, Schema } from "mongoose";

import { getEventDBConnection } from "@/app/lib/ConnectEventDB";
import type { IApiLogSetting } from "@/app/types/ApiLog";

const apiLogSettingSchema = new Schema<IApiLogSetting>(
  {
    key: {
      type: String,
      enum: ["api-logs"],
      default: "api-logs",
      required: true,
      unique: true,
    },
    retentionDays: {
      type: Number,
      required: true,
      enum: [7],
      default: 7,
    },
    slowThresholdMs: {
      type: Number,
      required: true,
      min: 100,
      max: 60_000,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, strict: true }
);

export function getApiLogSettingModel(): Model<IApiLogSetting> {
  const connection = getEventDBConnection();
  return (
    (connection.models.ApiLogSetting as
      | Model<IApiLogSetting>
      | undefined) ||
    connection.model<IApiLogSetting>(
      "ApiLogSetting",
      apiLogSettingSchema
    )
  );
}
