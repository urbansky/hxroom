CREATE TABLE "session_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"seq" bigserial NOT NULL,
	"sender" text NOT NULL,
	"sender_user_id" text,
	"client_message_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_chat_messages_booking_id_client_message_id_unique" UNIQUE("booking_id","client_message_id")
);
--> statement-breakpoint
ALTER TABLE "session_chat_messages" ADD CONSTRAINT "session_chat_messages_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_chat_messages" ADD CONSTRAINT "session_chat_messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_chat_messages" ADD CONSTRAINT "session_chat_messages_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_chat_messages_booking_seq_idx" ON "session_chat_messages" USING btree ("booking_id","seq");