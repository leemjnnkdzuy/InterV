import mongoose, { Document, Model, Schema } from "mongoose";

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

const emailChangePinSchema = new Schema<IEmailChangePin>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    currentEmailPin: {
      type: String,
      required: true,
    },
    currentEmailVerified: {
      type: Boolean,
      default: false,
    },
    newEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    newEmailPin: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.EmailChangePin) {
  delete mongoose.models.EmailChangePin;
}

const EmailChangePin: Model<IEmailChangePin> =
  mongoose.model<IEmailChangePin>("EmailChangePin", emailChangePinSchema);

export default EmailChangePin;
