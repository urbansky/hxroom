CREATE TABLE "session_chat_files" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"extension" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_chat_files_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
ALTER TABLE "session_chat_files" ADD CONSTRAINT "session_chat_files_message_id_session_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."session_chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_chat_files" ADD CONSTRAINT "session_chat_files_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_chat_files" ADD CONSTRAINT "session_chat_files_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_chat_files_booking_idx" ON "session_chat_files" USING btree ("booking_id");