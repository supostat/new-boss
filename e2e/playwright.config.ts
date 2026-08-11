import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

// Every command below runs from the repository root: webServer cwd defaults
// to this config's directory, and both servers expect root-relative paths.
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  globalSetup: fileURLToPath(new URL("./global-setup.ts", import.meta.url)),
  use: { baseURL: "http://localhost:5173" },
  webServer: [
    {
      command: "bun apps/server/src/main.ts",
      cwd: repositoryRoot,
      port: 3000,
      reuseExistingServer: true,
    },
    {
      command: "bunx vite --config apps/web/vite.config.ts",
      cwd: repositoryRoot,
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
