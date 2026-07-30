import nextEnv from "@next/env";
import mongoose from "mongoose";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const email = argument("email")?.trim().toLowerCase();
const role = argument("role")?.trim().toLowerCase();
const allowedRoles = new Set(["user", "recruiter", "admin"]);

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(
    "Usage: pnpm admin:set-role -- --email user@example.com --role admin"
  );
  process.exit(2);
}
if (!role || !allowedRoles.has(role)) {
  console.error("Role must be one of: user, recruiter, admin");
  process.exit(2);
}
const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) {
  console.error("MONGODB_URI is required in frontend/.env");
  process.exit(2);
}

try {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000,
  });
  const users = mongoose.connection.collection("users");
  const sessions = mongoose.connection.collection("sessions");
  const auditLogs = mongoose.connection.collection("adminauditlogs");
  const user = await users.findOne(
    { email },
    {
      projection: {
        _id: 1,
        username: 1,
        email: 1,
        role: 1,
        isActive: 1,
        isVerified: 1,
      },
    }
  );
  if (!user) {
    console.error(`No existing user found for ${email}`);
    process.exitCode = 1;
  } else if (!user.isVerified && role !== "user") {
    console.error("The account must be verified before receiving a privileged role");
    process.exitCode = 1;
  } else {
    const previousRole = user.role || "user";
    await users.updateOne(
      { _id: user._id, role: previousRole },
      { $set: { role, updatedAt: new Date() } }
    );
    await sessions.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    await auditLogs.insertOne({
      actorId: user._id,
      actorRole: "system",
      action: "USER_ROLE_SET_BY_CLI",
      targetType: "User",
      targetId: user._id.toString(),
      summary: `Set ${user.username} role from ${previousRole} to ${role} through local CLI`,
      changes: { previousRole, role },
      ipAddress: "local-cli",
      userAgent: "frontend/scripts/set-user-role.mjs",
      createdAt: new Date(),
    });
    console.log(
      `Updated ${user.email}: ${previousRole} -> ${role}. Active sessions revoked.`
    );
  }
} catch (error) {
  console.error(
    "Role update failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => undefined);
}
