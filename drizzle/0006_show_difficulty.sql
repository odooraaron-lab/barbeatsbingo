CREATE TYPE "public"."show_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "difficulty" "show_difficulty";