import mongoose, { Model, Schema } from "mongoose";

import type { IAdminAuditLog } from "@/app/types";

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      maxlength: 40,
    },
    action: {
      type: String,
      required: true,
      maxlength: 120,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      maxlength: 80,
      index: true,
    },
    targetId: {
      type: String,
      maxlength: 120,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 500,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      maxlength: 80,
    },
    userAgent: {
      type: String,
      maxlength: 256,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

if (mongoose.models.AdminAuditLog) {
  delete mongoose.models.AdminAuditLog;
}

const AdminAuditLog: Model<IAdminAuditLog> = mongoose.model<IAdminAuditLog>(
  "AdminAuditLog",
  adminAuditLogSchema
);

export default AdminAuditLog;
