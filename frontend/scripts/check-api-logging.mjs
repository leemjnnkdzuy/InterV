import fs from "node:fs";
import path from "node:path";

const apiRoot = path.join(process.cwd(), "app", "api");
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function routeFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? routeFiles(target) : [target];
    })
    .filter((file) => file.endsWith(`${path.sep}route.ts`));
}

const violations = [];
for (const file of routeFiles(apiRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const exported = methods.filter((method) =>
    new RegExp(`export const ${method}\\s*=`).test(source)
  );
  if (exported.length === 0) {
    violations.push(`${path.relative(process.cwd(), file)}: no API method export`);
    continue;
  }
  for (const method of exported) {
    if (
      !new RegExp(
        `export const ${method}\\s*=\\s*withApiLogging\\s*\\(`
      ).test(source)
    ) {
      violations.push(
        `${path.relative(process.cwd(), file)}: ${method} is not wrapped`
      );
    }
  }
}

if (violations.length > 0) {
  console.error("API logging coverage check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(
  `API logging coverage OK: ${routeFiles(apiRoot).length} route files.`
);
