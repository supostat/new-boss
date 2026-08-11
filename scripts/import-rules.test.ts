import { describe, expect, it } from "vitest";
import { classifyImport, importSpecifiers } from "./import-rules";

describe("importSpecifiers", () => {
  it("reads a value import as value", () => {
    expect(importSpecifiers('import { a } from "./a";')).toEqual([
      { specifier: "./a", typeOnly: false },
    ]);
  });

  it("reads a type-only import as type-only", () => {
    expect(importSpecifiers('import type { A } from "./a";')).toEqual([
      { specifier: "./a", typeOnly: true },
    ]);
  });

  it("reads a type-only re-export as type-only", () => {
    expect(importSpecifiers('export type { A } from "./a";')).toEqual([
      { specifier: "./a", typeOnly: true },
    ]);
  });

  it("reads a mixed import as value", () => {
    expect(importSpecifiers('import { type A, b } from "./a";')).toEqual([
      { specifier: "./a", typeOnly: false },
    ]);
  });

  it("reads a side-effect import as value", () => {
    expect(importSpecifiers('import "./side-effect";')).toEqual([
      { specifier: "./side-effect", typeOnly: false },
    ]);
  });

  it("reads a type-only import wrapped across lines", () => {
    const source = 'import type {\n  First,\n  Second,\n} from "./wide";';
    expect(importSpecifiers(source)).toEqual([
      { specifier: "./wide", typeOnly: true },
    ]);
  });

  it("reads a re-export and a star re-export as value", () => {
    const source = 'export { a } from "./a";\nexport * from "./b";';
    expect(importSpecifiers(source)).toEqual([
      { specifier: "./a", typeOnly: false },
      { specifier: "./b", typeOnly: false },
    ]);
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

describe("classifyImport: server-types-only", () => {
  it("allows a type-only import of the server in the web app", () => {
    const verdict = classifyImport(
      "apps/web/src/api.ts",
      "@boss/server/src/router",
      true,
    );
    expect(verdict).toBeNull();
  });

  it("rejects a value import of the server in the web app", () => {
    const violation = classifyImport(
      "apps/web/src/api.ts",
      "@boss/server/src/router",
      false,
    );
    expect(violation?.rule).toBe("server-types-only");
  });

  it("rejects a mixed import of the server in the web app", () => {
    const source = 'import { type AppRouter, appRouter } from "@boss/server";';
    const statement = importSpecifiers(source)[0];
    expect(statement?.typeOnly).toBe(false);
    const violation = classifyImport(
      "apps/web/src/api.ts",
      statement?.specifier ?? "",
      statement?.typeOnly ?? false,
    );
    expect(violation?.rule).toBe("server-types-only");
  });

  it("allows a value import of the server on the server side", () => {
    const verdict = classifyImport(
      "apps/server/src/app.ts",
      "@boss/server/src/router",
      false,
    );
    expect(verdict).toBeNull();
  });
});

describe("classifyImport: toast-isolated", () => {
  it("rejects sonner outside ui", () => {
    const violation = classifyImport(
      "apps/web/src/features/users/api.ts",
      "sonner",
    );
    expect(violation?.rule).toBe("toast-isolated");
  });

  it("allows sonner inside ui", () => {
    const verdict = classifyImport("apps/web/src/ui/toast.tsx", "sonner");
    expect(verdict).toBeNull();
  });
});

describe("classifyImport: command-isolated", () => {
  it("rejects cmdk outside ui", () => {
    const violation = classifyImport(
      "apps/web/src/shell/CommandMenu.tsx",
      "cmdk",
    );
    expect(violation?.rule).toBe("command-isolated");
  });

  it("allows cmdk inside ui", () => {
    const verdict = classifyImport("apps/web/src/ui/command.tsx", "cmdk");
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
