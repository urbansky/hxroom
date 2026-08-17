CREATE TABLE "coach_deletions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"requested_by" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"reminder_sent_at" timestamp,
	"revoked_at" timestamp,
	"executed_at" timestamp,
	"deleted_counts" jsonb
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "deletion_scheduled_for" timestamp;