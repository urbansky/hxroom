CREATE TABLE "client_deletions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"deleted_by" text NOT NULL,
	"deleted_at" timestamp DEFAULT now() NOT NULL,
	"bookings_deleted" integer NOT NULL,
	"files_deleted" integer NOT NULL
);
