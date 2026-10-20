CREATE TYPE "public"."activity_kind" AS ENUM('downloaded', 'login', 'login_failed', 'show_viewed', 'show_played', 'searched', 'category_requested', 'password_changed', 'password_reset', 'play_mode_changed');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"playlist_id" uuid,
	"file_id" uuid,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_idx" ON "activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_user_kind_idx" ON "activity" USING btree ("user_id","kind","created_at");--> statement-breakpoint
-- Bring in the downloads made before the activity log existed.
INSERT INTO "activity" ("user_id", "kind", "playlist_id", "file_id", "detail", "created_at")
SELECT d."user_id", 'downloaded', f."playlist_id", d."file_id", f."title", d."created_at"
FROM "downloads" d JOIN "files" f ON f."id" = d."file_id";
