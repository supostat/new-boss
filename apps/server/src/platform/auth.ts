import { createDatabaseClient } from "@boss/db";
import * as authSchema from "@boss/db/schema/auth";
import type { Level } from "@boss/shared/domain/authz";
import { LEVELS } from "@boss/shared/domain/authz";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "./env";

const { db } = createDatabaseClient();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.TRUSTED_ORIGINS,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
    },
  },
  user: {
    additionalFields: {
      level: {
        type: [...LEVELS],
        required: true,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

export interface NewUser {
  email: string;
  password: string;
  name: string;
  level: Level;
}

// Registration is closed: the public sign-up endpoint rejects everyone, so
// users enter only through this server-side surface. It drives the library's
// own machinery — its password hash, its adapter, its hooks — never a
// parallel implementation of the credential contract.
export async function createUser(newUser: NewUser): Promise<string> {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({
    email: newUser.email,
    name: newUser.name,
    emailVerified: false,
    level: newUser.level,
  });
  await context.internalAdapter.linkAccount({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: await context.password.hash(newUser.password),
  });
  return user.id;
}
