import { atLeast } from "@boss/shared/domain/authz";
import { initTRPC, TRPCError } from "@trpc/server";
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

const t = initTRPC.context<TrpcContext>().create();

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
