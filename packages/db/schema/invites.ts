import { LEVELS } from "@boss/shared/domain/authz";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const invite = pgTable("invite", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  level: text("level", { enum: LEVELS }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Invite = typeof invite.$inferSelect;
