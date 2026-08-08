import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDatabaseClient } from "./client";

describe("database client", () => {
  it("reaches compose Postgres through the default URL and answers SELECT 1", async () => {
    const { db, pool } = createDatabaseClient();
    try {
      const result = await db.execute(sql`select 1 as one`);
      expect(result.rows).toEqual([{ one: 1 }]);
    } finally {
      await pool.end();
    }
  });
});
