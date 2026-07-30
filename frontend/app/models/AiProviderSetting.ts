import mongoose, { Model, Schema } from "mongoose";

import type { IAiProviderSetting } from "@/app/types/AiUsage";

const pricingSchema = new Schema(
  {
    model: { type: String, required: true, maxlength: 120 },
    cacheHitInputUsdPerMillion: { type: Number, required: true, min: 0 },
    cacheMissInputUsdPerMillion: { type: Number, required: true, min: 0 },
    outputUsdPerMillion: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const aiProviderSettingSchema = new Schema<IAiProviderSetting>(
  {
    provider: {
      type: String,
      enum: ["deepseek"],
      required: true,
      unique: true,
      index: true,
    },
    pricing: {
      type: [pricingSchema],
      required: true,
      validate: {
        validator: (items: IAiProviderSetting["pricing"]) =>
          items.length >= 1 &&
          items.length <= 10 &&
          new Set(items.map((item) => item.model)).size === items.length,
        message: "Pricing must contain unique model names",
      },
    },
    monthlyBudgetUsd: { type: Number, default: 50, min: 0, max: 1_000_000 },
    lowBalanceThresholdUsd: {
      type: Number,
      default: 5,
      min: 0,
      max: 1_000_000,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

if (mongoose.models.AiProviderSetting) {
  delete mongoose.models.AiProviderSetting;
}

const AiProviderSetting: Model<IAiProviderSetting> =
  mongoose.model<IAiProviderSetting>(
    "AiProviderSetting",
    aiProviderSettingSchema
  );

export default AiProviderSetting;
