ALTER TABLE "session_chat_messages" ADD COLUMN "file_removed_at" timestamp;--> statement-breakpoint
ALTER TABLE "session_chat_messages" ADD COLUMN "file_removed_by" text;