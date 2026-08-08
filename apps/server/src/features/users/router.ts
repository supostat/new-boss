import { createDatabaseClient } from "@boss/db";
import { LEVELS } from "@boss/shared/domain/authz";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../../platform/trpc";
import { pendingInvites } from "./queries";
import {
  acceptInvite,
  createInvite,
  resendInvite,
  revokeInvite,
} from "./service";

const { db } = createDatabaseClient();

export const usersRouter = router({
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
