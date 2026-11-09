ALTER TABLE "availability_settings" ADD COLUMN "calendar_feed_token" text;--> statement-breakpoint
ALTER TABLE "availability_settings" ADD COLUMN "calendar_feed_hide_names" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "availability_settings" ADD CONSTRAINT "availability_settings_calendar_feed_token_unique" UNIQUE("calendar_feed_token");