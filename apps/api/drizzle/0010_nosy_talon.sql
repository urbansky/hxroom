ALTER TABLE "clients" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;