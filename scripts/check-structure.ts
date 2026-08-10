// Structure guard: asserts every path of the frozen §III skeleton exists.
// Exit 0 = clean; exit 1 = lists what is missing. Single argv gate: bun scripts/check-structure.ts
import { existsSync } from "node:fs";

const requiredDirs = [
  "apps/server/src/features/hours-confirmation",
  "apps/server/src/features/staff",
  "apps/server/src/features/venues",
  "apps/server/src/platform",
  "apps/server/src/rest/v1",
  "apps/web/src/features/hours-confirmation",
  "apps/web/src/features/staff",
  "apps/web/src/shell",
  "apps/web/src/ui/domain",
  "apps/web/src/styles",
  "packages/db/schema",
  "packages/db/migrations",
  "packages/db/seed",
  "packages/shared/schemas",
  "packages/shared/domain",
  "e2e",
  "scripts",
  "docker",
];

const requiredFiles = [
  "CLAUDE.md",
  "package.json",
  "apps/server/package.json",
  "apps/web/package.json",
  "packages/db/package.json",
  "packages/shared/package.json",
  "scripts/check-structure.ts",
];

const missing = [...requiredDirs, ...requiredFiles].filter((p) => !existsSync(p));

if (missing.length > 0) {
  console.error("Missing paths:");
  for (const p of missing) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`Structure OK: ${requiredDirs.length} dirs, ${requiredFiles.length} files.`);
