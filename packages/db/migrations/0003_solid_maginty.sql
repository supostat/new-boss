CREATE TABLE "user_venue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"venue_id" uuid NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text GENERATED ALWAYS AS (btrim(lower(regexp_replace(regexp_replace(btrim("venue"."name"), '[[:punct:]]+', '', 'g'), '\s+', ' ', 'g')))) STORED NOT NULL,
	"disabled_at" timestamp with time zone,
	"disabled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_venue" ADD CONSTRAINT "user_venue_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_venue" ADD CONSTRAINT "user_venue_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue" ADD CONSTRAINT "venue_disabled_by_user_id_fk" FOREIGN KEY ("disabled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_venue_userId_idx" ON "user_venue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_venue_venueId_idx" ON "user_venue" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_normalizedName_unique" ON "venue" USING btree ("normalized_name");