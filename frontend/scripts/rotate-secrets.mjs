import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendEnv = resolve(scriptDir, "..", ".env");
const backendEnv = resolve(scriptDir, "..", "..", "backend", ".env");

function randomSecret() {
  return randomBytes(48).toString("base64url");
}

function updateEnv(path, updates) {
  const original = readFileSync(path, "utf8");
  const seen = new Set();
  const lines = original.split(/\r?\n/).map((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (!match || !(match[1] in updates)) {
      return line;
    }
    seen.add(match[1]);
    return `${match[1]}=${updates[match[1]]}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      lines.push(`${key}=${value}`);
    }
  }
  writeFileSync(path, `${lines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}

const internalKey = randomSecret();
updateEnv(frontendEnv, {
  JWT_ACCESS_SECRET: randomSecret(),
  JWT_REFRESH_SECRET: randomSecret(),
  AI_BACKEND_INTERNAL_KEY: internalKey,
});
updateEnv(backendEnv, {
  AI_BACKEND_INTERNAL_KEY: internalKey,
});

process.stdout.write(
  "Rotated JWT and shared gRPC secrets. Existing browser sessions are now invalid.\n"
);
