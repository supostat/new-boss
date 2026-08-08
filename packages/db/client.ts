import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// The single source of the compose default: drizzle.config.ts runs standalone
// under drizzle-kit and platform/env.ts runs inside the server — both call this.
export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "postgres://boss:boss@localhost:5432/boss";
}

export function createDatabaseClient() {
  // allowExitOnIdle lets short-lived processes (tests, CLI scripts) finish
  // without hanging on the pool; a listening server stays alive regardless.
  const pool = new Pool({
    connectionString: databaseUrl(),
    allowExitOnIdle: true,
  });
  return { db: drizzle(pool), pool };
}
