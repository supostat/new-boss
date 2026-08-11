import { createDatabaseClient } from "@boss/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../../platform/trpc";
import { canManageVenues } from "./policy";
import { listVenues, venueMembers } from "./queries";
import {
  archiveVenue,
  assignMembership,
  closeMembership,
  createVenue,
  removeMembership,
  renameVenue,
  restoreVenue,
} from "./service";

const { db } = createDatabaseClient();

// Rights sit here, once: every venue procedure passes the named policy.
const venueAdminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.session === null) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!canManageVenues(ctx.session.user.level)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { session: ctx.session } });
});

export const venuesRouter = router({
  list: venueAdminProcedure.query(() => listVenues(db)),
  create: venueAdminProcedure
    .input(z.object({ name: z.string().trim().min(1) }))
    .mutation(({ input }) => createVenue(input.name)),
  rename: venueAdminProcedure
    .input(z.object({ venueId: z.uuid(), name: z.string().trim().min(1) }))
    .mutation(({ input }) => renameVenue(input.venueId, input.name)),
  archive: venueAdminProcedure
    .input(z.object({ venueId: z.uuid() }))
    .mutation(({ input, ctx }) =>
      archiveVenue(input.venueId, ctx.session.user.id),
    ),
  restore: venueAdminProcedure
    .input(z.object({ venueId: z.uuid() }))
    .mutation(({ input }) => restoreVenue(input.venueId)),
  members: router({
    list: venueAdminProcedure
      .input(z.object({ venueId: z.uuid() }))
      .query(({ input }) => venueMembers(db, input.venueId)),
    assign: venueAdminProcedure
      .input(
        z.object({
          venueId: z.uuid(),
          userId: z.string().min(1),
          from: z.date(),
          to: z.date().nullable(),
        }),
      )
      .mutation(({ input }) => assignMembership(input)),
    close: venueAdminProcedure
      .input(z.object({ membershipId: z.uuid(), to: z.date() }))
      .mutation(({ input }) => closeMembership(input.membershipId, input.to)),
    remove: venueAdminProcedure
      .input(z.object({ membershipId: z.uuid() }))
      .mutation(({ input }) => removeMembership(input.membershipId)),
  }),
});
