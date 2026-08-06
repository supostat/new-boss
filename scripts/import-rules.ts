// Import rules of the monorepo, as a pure verdict over (file path, specifier).
// Statements are assembled from lines and matched by regex — no AST parser and
// no dependency. Consequence: dynamic import() expressions are not inspected;
// these rules cover static import and export-from only.
import { posix } from "node:path";

export interface Violation {
  rule: string;
  reason: string;
}

const MODULE_STATEMENT = /^(?:import\b|export\s*(?:type\s*)?\{|export\s*\*)/;
const FROM_SPECIFIER = /\bfrom\s*["']([^"']+)["']/;
const SIDE_EFFECT_SPECIFIER = /^import\s*["']([^"']+)["']/;

const SLICE = /^apps\/(?:server|web)\/src\/features\/([^/]+)(?:\/|$)/;
const WEB_APP = "apps/web/";
const WEB_UI = "apps/web/src/ui/";
const WEB_FEATURES = "apps/web/src/features/";
const AUTH_MODULE = "apps/server/src/platform/auth.ts";

function hasOpenBrace(statement: string): boolean {
  let depth = 0;
  for (const character of statement) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
  }
  return depth > 0;
}

export function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  let statement = "";
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (statement === "" && !MODULE_STATEMENT.test(line)) continue;
    statement = statement === "" ? line : `${statement} ${line}`;
    if (hasOpenBrace(statement)) continue;
    const specifier =
      FROM_SPECIFIER.exec(statement)?.[1] ??
      SIDE_EFFECT_SPECIFIER.exec(statement)?.[1];
    if (specifier !== undefined) specifiers.push(specifier);
    statement = "";
  }
  return specifiers;
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  return posix.normalize(posix.join(posix.dirname(fromFile), specifier));
}

function isPackage(specifier: string, name: string): boolean {
  return specifier === name || specifier.startsWith(`${name}/`);
}

function sliceOf(path: string): string | null {
  return SLICE.exec(path)?.[1] ?? null;
}

export function classifyImport(
  filePath: string,
  specifier: string,
): Violation | null {
  if (isPackage(specifier, "better-auth") && filePath !== AUTH_MODULE) {
    return {
      rule: "auth-isolated",
      reason: `better-auth belongs to ${AUTH_MODULE} alone`,
    };
  }

  if (filePath.startsWith(WEB_APP) && isPackage(specifier, "@boss/db")) {
    return {
      rule: "db-server-only",
      reason: "@boss/db is server-only and never enters the web app",
    };
  }

  const target = resolveRelative(filePath, specifier);
  if (target === null) return null;

  if (filePath.startsWith(WEB_UI) && target.startsWith(WEB_FEATURES)) {
    return { rule: "ui-never-features", reason: "ui never imports features" };
  }

  const ownSlice = sliceOf(filePath);
  const targetSlice = sliceOf(target);
  if (ownSlice !== null && targetSlice !== null && ownSlice !== targetSlice) {
    return {
      rule: "cross-slice",
      reason: `slice ${ownSlice} must not reach into slice ${targetSlice}`,
    };
  }

  return null;
}
