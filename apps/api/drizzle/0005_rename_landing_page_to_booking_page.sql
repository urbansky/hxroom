ALTER TABLE "landing_page" RENAME TO "booking_page";--> statement-breakpoint
ALTER TABLE "booking_page" RENAME CONSTRAINT "landing_page_organization_id_unique" TO "booking_page_organization_id_unique";--> statement-breakpoint
ALTER TABLE "booking_page" RENAME CONSTRAINT "landing_page_organization_id_organization_id_fk" TO "booking_page_organization_id_organization_id_fk";--> statement-breakpoint
ALTER TABLE "booking_page" RENAME CONSTRAINT "landing_page_pkey" TO "booking_page_pkey";
