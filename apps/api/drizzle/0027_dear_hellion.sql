ALTER TABLE "booking_page" ADD COLUMN "imprint_mode" text;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "imprint" jsonb;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "imprint_url" text;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "imprint_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "privacy_url" text;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "terms_url" text;