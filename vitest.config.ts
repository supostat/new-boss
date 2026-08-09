import { configDefaults, defineConfig } from "vitest/config";

// Integration tests share one live compose Postgres and one job queue;
// sequential files keep their rows and queue state from racing each other.
// e2e/ belongs to Playwright — its specs never run under vitest.
export default defineConfig({
  test: {
    fileParallelism: false,
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
