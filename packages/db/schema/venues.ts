import { type SQL, sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const venue = pgTable(
  "venue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Normalization lives only here (trim → strip punctuation → collapse
    // whitespace → lower); the app never normalizes in TS, so the database
    // and the app cannot disagree.
    normalizedName: text("normalized_name")
      .notNull()
      .generatedAlwaysAs(
        (): SQL =>
          sql`btrim(lower(regexp_replace(regexp_replace(btrim(${venue.name}), '[[:punct:]]+', '', 'g'), '\\s+', ' ', 'g')))`,
      ),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledBy: text("disabled_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("venue_normalizedName_unique").on(table.normalizedName),
  ],
);

export const userVenue = pgTable(
  "user_venue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venue.id),
    // Validity window is [valid_from, valid_to): from inclusive, to exclusive;
    // valid_to IS NULL means open-ended. Overlapping windows are legal —
    // membership is the union of windows.
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_venue_userId_idx").on(table.userId),
    index("user_venue_venueId_idx").on(table.venueId),
  ],
);

export type Venue = typeof venue.$inferSelect;
export type UserVenue = typeof userVenue.$inferSelect;
