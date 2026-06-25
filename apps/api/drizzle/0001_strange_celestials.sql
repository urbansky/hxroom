CREATE TABLE "landing_page" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"tagline" text,
	"bio" text,
	"cta_button" text,
	"cta_intro" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "landing_page_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;