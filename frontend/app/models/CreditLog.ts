import mongoose, { Model, Schema } from "mongoose";
import { ICreditLog } from "@/app/types";

const creditLogSchema = new Schema<ICreditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    credits: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "RECHARGE",
        "AI_INTERVIEW",
        "AI_INTERVIEW_REFUND",
        "AI_JD_EXTRACT",
        "REGISTER_BONUS",
        "ADMIN_ADJUST",
      ],
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    referenceId: {
      type: String,
      default: "",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

creditLogSchema.index(
  { action: 1, referenceId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      action: "ADMIN_ADJUST",
      referenceId: { $gt: "" },
    },
  }
);

if (mongoose.models.CreditLog) {
  delete mongoose.models.CreditLog;
}

const CreditLog: Model<ICreditLog> = mongoose.model<ICreditLog>("CreditLog", creditLogSchema);

export default CreditLog;
