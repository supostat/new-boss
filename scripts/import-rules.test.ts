import { describe, expect, it } from "vitest";
import { classifyImport, importSpecifiers } from "./import-rules";

describe("importSpecifiers", () => {
  it("reads a value import", () => {
    expect(importSpecifiers('import { a } from "./a";')).toEqual(["./a"]);
  });

  it("reads a type-only import", () => {
    expect(importSpecifiers('import type { A } from "./a";')).toEqual(["./a"]);
  });

  it("reads a side-effect import", () => {
    expect(importSpecifiers('import "./side-effect";')).toEqual([
      "./side-effect",
    ]);
  });

  it("reads an import wrapped across lines", () => {
    const source = 'import {\n  first,\n  second,\n} from "./wide";';
    expect(importSpecifiers(source)).toEqual(["./wide"]);
  });

  it("reads a re-export and a star re-export", () => {
    const source = 'export { a } from "./a";\nexport * from "./b";';
    expect(importSpecifiers(source)).toEqual(["./a", "./b"]);
  });

  it("ignores a declaration that merely starts with export", () => {
    const source = 'export const NAME = "not-a-specifier";';
    expect(importSpecifiers(source)).toEqual([]);
  });

  it("ignores a dynamic import expression", () => {
    expect(importSpecifiers('import("./lazy");')).toEqual([]);
  });
});

describe("classifyImport: cross-slice", () => {
  it("rejects one server slice reaching into another", () => {
    const violation = classifyImport(
      "apps/server/src/features/staff/service.ts",
      "../hours-confirmation/queries",
    );
    expect(violation?.rule).toBe("cross-slice");
  });

  it("rejects one web slice reaching into another", () => {
    const violation = classifyImport(
      "apps/web/src/features/staff/api.ts",
      "../hours-confirmation/api",
    );
    expect(violation?.rule).toBe("cross-slice");
  });

  it("allows a slice reaching inside itself", () => {
    const verdict = classifyImport(
      "apps/server/src/features/staff/router.ts",
      "./service",
    );
    expect(verdict).toBeNull();
  });

  it("allows a slice reaching into platform", () => {
    const verdict = classifyImport(
      "apps/server/src/features/staff/jobs.ts",
      "../../platform/queue",
    );
    expect(verdict).toBeNull();
  });
});

describe("classifyImport: db-server-only", () => {
  it("rejects the db package in the web app", () => {
    const violation = classifyImport(
      "apps/web/src/features/staff/api.ts",
      "@boss/db",
    );
    expect(violation?.rule).toBe("db-server-only");
  });

  it("rejects a db subpath in the web app", () => {
    const violation = classifyImport(
      "apps/web/src/shell/header.tsx",
      "@boss/db/schema",
    );
    expect(violation?.rule).toBe("db-server-only");
  });

  it("allows the db package on the server", () => {
    const verdict = classifyImport(
      "apps/server/src/features/staff/queries.ts",
      "@boss/db",
    );
    expect(verdict).toBeNull();
  });

  it("allows the shared package in the web app", () => {
    const verdict = classifyImport(
      "apps/web/src/features/staff/api.ts",
      "@boss/shared",
    );
    expect(verdict).toBeNull();
  });
});

describe("classifyImport: ui-never-features", () => {
  it("rejects ui reaching into features", () => {
    const violation = classifyImport(
      "apps/web/src/ui/domain/status-pill.tsx",
      "../../features/staff/api",
    );
    expect(violation?.rule).toBe("ui-never-features");
  });

  it("allows ui reaching inside itself", () => {
    const verdict = classifyImport(
      "apps/web/src/ui/domain/status-pill.tsx",
      "../button",
    );
    expect(verdict).toBeNull();
  });
});

describe("classifyImport: auth-isolated", () => {
  it("rejects the auth library outside the platform module", () => {
    const violation = classifyImport(
      "apps/server/src/features/staff/router.ts",
      "better-auth",
    );
    expect(violation?.rule).toBe("auth-isolated");
  });

  it("rejects an auth subpath outside the platform module", () => {
    const violation = classifyImport(
      "apps/web/src/shell/header.tsx",
      "better-auth/react",
    );
    expect(violation?.rule).toBe("auth-isolated");
  });

  it("allows the auth library inside the platform module", () => {
    const verdict = classifyImport(
      "apps/server/src/platform/auth.ts",
      "better-auth",
    );
    expect(verdict).toBeNull();
  });
});
