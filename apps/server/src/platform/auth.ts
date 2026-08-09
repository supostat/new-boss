import { createDatabaseClient } from "@boss/db";
import * as authSchema from "@boss/db/schema/auth";
import type { Level } from "@boss/shared/domain/authz";
import { LEVELS } from "@boss/shared/domain/authz";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
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
  databaseHooks: {
    session: {
      create: {
        // A disabled user gets no new session: sign-in dies here, before
        // any session row exists.
        before: async (session, hookContext) => {
          if (hookContext == null) {
            return;
          }
          const user = (await hookContext.context.internalAdapter.findUserById(
            session.userId,
          )) as { disabledAt?: Date | null } | null;
          if (user?.disabledAt != null) {
            throw new APIError("FORBIDDEN", {
              message: "This account is disabled",
            });
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      level: {
        type: [...LEVELS],
        required: true,
        input: false,
      },
      disabledAt: {
        type: "date",
        required: false,
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

// The session table has one writer — the library. Revocation goes through
// its own machinery, never through a query from a slice.
export async function revokeUserSessions(userId: string): Promise<void> {
  const context = await auth.$context;
  const sessions = await context.internalAdapter.listSessions(userId);
  if (sessions.length === 0) {
    return;
  }
  await context.internalAdapter.deleteSessions(
    sessions.map((liveSession) => liveSession.token),
  );
}
