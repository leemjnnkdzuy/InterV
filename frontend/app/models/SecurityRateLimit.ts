import mongoose, { Model, Schema } from "mongoose";

interface ISecurityRateLimit {
  key: string;
  count: number;
  resetAt: Date;
  expiresAt: Date;
}

const securityRateLimitSchema = new Schema<ISecurityRateLimit>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    resetAt: { type: Date, required: true },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { versionKey: false }
);

const SecurityRateLimit: Model<ISecurityRateLimit> =
  mongoose.models.SecurityRateLimit ||
  mongoose.model<ISecurityRateLimit>(
    "SecurityRateLimit",
    securityRateLimitSchema
  );

export default SecurityRateLimit;
