import { atLeast } from "@boss/shared/domain/authz";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Session } from "./auth";
import { auth } from "./auth";

export interface TrpcContext {
  session: Session | null;
}

export async function createTrpcContext(
  request: Request,
): Promise<TrpcContext> {
  const session = await auth.api.getSession({ headers: request.headers });
  return { session };
}

// superjson keeps Date a Date across the wire — without it the types would
// promise what JSON cannot deliver.
const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session === null) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!atLeast(ctx.session.user.level, "admin")) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { session: ctx.session } });
});
