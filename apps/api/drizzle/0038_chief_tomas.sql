CREATE TABLE "calendar_busy_times" (
	"id" text PRIMARY KEY NOT NULL,
	"calendar_import_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"url_encrypted" text NOT NULL,
	"url_hint" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"block_all_day" boolean DEFAULT false NOT NULL,
	"syncing_since" timestamp,
	"last_attempt_at" timestamp,
	"last_success_at" timestamp,
	"last_error" text,
	"failing_since" timestamp,
	"failure_mail_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_busy_times" ADD CONSTRAINT "calendar_busy_times_calendar_import_id_calendar_imports_id_fk" FOREIGN KEY ("calendar_import_id") REFERENCES "public"."calendar_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_busy_times" ADD CONSTRAINT "calendar_busy_times_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_imports" ADD CONSTRAINT "calendar_imports_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_busy_times_org_start_idx" ON "calendar_busy_times" USING btree ("organization_id","start_time");--> statement-breakpoint
CREATE INDEX "calendar_busy_times_import_idx" ON "calendar_busy_times" USING btree ("calendar_import_id");--> statement-breakpoint
CREATE INDEX "calendar_imports_org_idx" ON "calendar_imports" USING btree ("organization_id");