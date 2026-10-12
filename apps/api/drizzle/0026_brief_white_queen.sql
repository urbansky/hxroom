ALTER TABLE "booking_page" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "topics" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "quote" text;--> statement-breakpoint
ALTER TABLE "booking_page" ADD COLUMN "qualifications" text[] DEFAULT '{}'::text[] NOT NULL;