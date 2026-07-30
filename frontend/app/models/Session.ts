import mongoose, { Model, Schema } from "mongoose";
import { ISession } from "@/app/types";

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceInfo: {
      type: String,
      default: "Unknown device",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    refreshTokenHash: {
      type: String,
      default: "",
      select: false,
    },
    previousRefreshTokenHash: {
      type: String,
      default: "",
      select: false,
    },
    previousRefreshValidUntil: {
      type: Date,
    },
    refreshExpiresAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
sessionSchema.index({ refreshExpiresAt: 1 }, { expireAfterSeconds: 0 });

if (mongoose.models.Session) {
  delete mongoose.models.Session;
}

const Session: Model<ISession> = mongoose.model<ISession>("Session", sessionSchema);

if (mongoose.connection.readyState === 1) {
  Session.collection.dropIndex("sessionId_1").catch(() => {});
} else {
  mongoose.connection.once("open", () => {
    Session.collection.dropIndex("sessionId_1").catch(() => {});
  });
}

export default Session;
