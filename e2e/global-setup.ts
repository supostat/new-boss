import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { E2E_ADMIN } from "./credentials";

export default function globalSetup(): void {
  const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
  const result = spawnSync("bun", ["scripts/create-admin.ts"], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD: E2E_ADMIN.password,
    },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("create-admin failed during e2e global setup");
  }
}
