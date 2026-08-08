import { defineConfig } from "vitest/config";

// Integration tests share one live compose Postgres and one job queue;
// sequential files keep their rows and queue state from racing each other.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
