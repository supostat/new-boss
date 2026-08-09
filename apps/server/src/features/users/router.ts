import { createDatabaseClient } from "@boss/db";
import { LEVELS } from "@boss/shared/domain/authz";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../../platform/trpc";
import { canDisableUser } from "./policy";
import { listUsers, pendingInvites } from "./queries";
import {
  acceptInvite,
  createInvite,
  disableUser,
  enableUser,
  resendInvite,
  revokeInvite,
} from "./service";

const { db } = createDatabaseClient();

export const usersRouter = router({
  list: adminProcedure.query(() => listUsers(db)),
  disable: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(({ input, ctx }) => {
      const actor = ctx.session.user;
      if (!canDisableUser(actor.level, actor.id, input.userId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return disableUser(input.userId);
    }),
  enable: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(({ input }) => enableUser(input.userId)),
  invite: router({
    create: adminProcedure
      .input(z.object({ email: z.email(), level: z.enum(LEVELS) }))
      .mutation(({ input, ctx }) =>
        createInvite({
          email: input.email,
          level: input.level,
          invitedBy: ctx.session.user.id,
        }),
      ),
    list: adminProcedure.query(() => pendingInvites(db)),
    revoke: adminProcedure
      .input(z.object({ inviteId: z.uuid() }))
      .mutation(({ input }) => revokeInvite(input.inviteId)),
    resend: adminProcedure
      .input(z.object({ inviteId: z.uuid() }))
      .mutation(({ input }) => resendInvite(input.inviteId)),
    accept: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
          password: z.string().min(8),
          name: z.string().min(1),
        }),
      )
      .mutation(({ input }) => acceptInvite(input)),
  }),
});
