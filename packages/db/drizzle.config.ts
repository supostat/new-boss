import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./client";

// drizzle-kit resolves these paths from the directory it runs in — the
// repository root — not from this file's location.
export default defineConfig({
  schema: "./packages/db/schema",
  out: "./packages/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
});
