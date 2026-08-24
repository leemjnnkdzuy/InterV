import mongoose, { Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "@/app/types";

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [12, "Password must be at least 12 characters"],
      maxlength: [128, "Password cannot exceed 128 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "recruiter", "admin"],
      default: "user",
      index: true,
    },
    avatar: {
      type: String,
      default: "",
      maxlength: 3 * 1024 * 1024,
    },
    dob: {
      type: Date,
    },
    socialLinks: {
      type: [
        {
          platform: { type: String, required: true, maxlength: 30 },
          usernameOrUrl: { type: String, required: true, maxlength: 300 },
          _id: false,
        },
      ],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    credits: {
      type: Number,
      default: 500,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    headline: {
      type: String,
      default: "",
      trim: true,
      maxlength: [200, "Headline cannot exceed 200 characters"],
    },
    targetRole: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100, "Target role cannot exceed 100 characters"],
    },
    targetIndustry: {
      type: String,
      default: "",
      trim: true,
      maxlength: [100, "Target industry cannot exceed 100 characters"],
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: [
        {
          school: { type: String, required: true, maxlength: 150 },
          major: { type: String, default: "", maxlength: 150 },
          degree: { type: String, default: "", maxlength: 100 },
          startYear: { type: Number },
          endYear: { type: Number },
          _id: false,
        },
      ],
      default: [],
    },
    workExperience: {
      type: [
        {
          company: { type: String, required: true, maxlength: 150 },
          role: { type: String, required: true, maxlength: 150 },
          duration: { type: String, default: "", maxlength: 100 },
          description: { type: String, default: "", maxlength: 1000 },
          _id: false,
        },
      ],
      default: [],
    },
    cvFile: {
      name: { type: String, default: "" },
      size: { type: Number, default: 0 },
      data: { type: String, default: "" },
      uploadedAt: { type: Date },
      _id: false,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.$locals.passwordAlreadyHashed === true) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
