// Import guard: applies the rules of import-rules.ts to every tracked and
// untracked-but-not-ignored TypeScript source under apps/ and packages/.
// Exit 0 = clean; exit 1 = lists every forbidden import, or reports that the
// scan found nothing to inspect — an import guard that sees no sources is
// broken, not clean. Single argv gate: bun scripts/check-imports.ts
import { existsSync, readFileSync } from "node:fs";
import { classifyImport, importSpecifiers } from "./import-rules";

function isSource(path: string): boolean {
  return path.endsWith(".ts") || path.endsWith(".tsx");
}

function listSources(): string[] {
  const listing = Bun.spawnSync([
    "git",
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "apps",
    "packages",
  ]);
  if (listing.exitCode !== 0) {
    console.error("git ls-files failed; run this guard inside the repository.");
    process.exit(1);
  }
  return listing.stdout
    .toString()
    .split("\n")
    .filter(isSource)
    .filter((path) => existsSync(path));
}

const sources = listSources();

if (sources.length === 0) {
  console.error("No TypeScript sources found under apps/ and packages/.");
  process.exit(1);
}

const violations: string[] = [];

for (const path of sources) {
  const source = readFileSync(path, "utf8");
  for (const { specifier, typeOnly } of importSpecifiers(source)) {
    const violation = classifyImport(path, specifier, typeOnly);
    if (violation !== null) {
      violations.push(
        `${path}: ${specifier} — ${violation.rule}: ${violation.reason}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Forbidden imports:");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(`Imports OK: ${sources.length} sources scanned.`);
