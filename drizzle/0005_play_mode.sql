CREATE TABLE "show_syncs" (
	"user_id" uuid NOT NULL,
	"playlist_id" uuid NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "show_syncs_user_id_playlist_id_pk" PRIMARY KEY("user_id","playlist_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "can_play" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "play_mode" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "show_syncs" ADD CONSTRAINT "show_syncs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_syncs" ADD CONSTRAINT "show_syncs_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;