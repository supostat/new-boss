import { databaseUrl } from "@boss/db";
import { z } from "zod";

// Every variable a test or gate touches carries a dev default, because gates
// spawn bare processes without a shell or env file. Production overrides all
// of these through the deployment environment. Credentials never default.
const environmentSchema = z.object({
  DATABASE_URL: z.url().default(databaseUrl()),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .default("dev-secret-not-for-production-use-dokku-env"),
  TRUSTED_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((origins) => origins.split(",").map((origin) => origin.trim())),
  PORT: z.coerce.number().int().positive().default(3000),
});

export const env = environmentSchema.parse(process.env);
