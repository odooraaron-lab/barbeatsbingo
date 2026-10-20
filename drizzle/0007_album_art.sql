CREATE TABLE "song_art" (
	"key" text PRIMARY KEY NOT NULL,
	"artist" text NOT NULL,
	"title" text NOT NULL,
	"image_url" text,
	"source" text,
	"looked_up_at" timestamp with time zone DEFAULT now() NOT NULL
);
