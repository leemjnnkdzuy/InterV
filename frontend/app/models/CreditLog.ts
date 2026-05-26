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
      enum: ["RECHARGE", "AI_INTERVIEW", "REGISTER_BONUS", "ADMIN_ADJUST"],
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.CreditLog) {
  delete mongoose.models.CreditLog;
}

const CreditLog: Model<ICreditLog> = mongoose.model<ICreditLog>("CreditLog", creditLogSchema);

export default CreditLog;
