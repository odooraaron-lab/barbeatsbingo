import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { FileMeta } from "../lib/file-meta";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const userRole = pgEnum("user_role", ["admin", "member"]);

export const fileKind = pgEnum("file_kind", [
  "video",
  "audio",
  "scorecards",
  "host_sheet",
  "document",
  "archive",
  "other",
  // A small MP3 of a show, used only by the audio player (not listed as a download).
  "preview",
]);

export const fileSource = pgEnum("file_source", ["storage", "link"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  venue: text("venue").notNull().default(""),
  phone: text("phone").notNull().default(""),
  // Null until the customer sets a password from an invite link.
  passwordHash: text("password_hash"),
  role: userRole("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  accessAll: boolean("access_all").notNull().default(false),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token. The raw token is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent").notNull().default(""),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordTokens = pgTable(
  "password_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: ["reset", "invite"] }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("password_tokens_user_idx").on(t.userId)],
);

export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ip: text("ip").notNull().default(""),
    success: boolean("success").notNull(),
    ...timestamps,
  },
  (t) => [index("auth_attempts_email_idx").on(t.email, t.createdAt)],
);

/** Top level of the library, e.g. "Country", "Pub Classics". */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  ...timestamps,
});

/** Second level: a playlist / show inside a genre. */
export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("playlists_category_slug_idx").on(t.categoryId, t.slug)],
);

/** A downloadable item inside a playlist: a round video, scorecards PDF, etc. */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Optional heading the file is grouped under, e.g. "Round 1" or "Printables".
    groupLabel: text("group_label").notNull().default(""),
    kind: fileKind("kind").notNull().default("other"),
    source: fileSource("source").notNull(),
    storageKey: text("storage_key"),
    externalUrl: text("external_url"),
    fileName: text("file_name").notNull().default(""),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    contentType: text("content_type").notNull().default(""),
    // Playing time in seconds, read from the file when its link is saved (MP3s). Lets the
    // player show the length before any sound has loaded, which matters on iPhones.
    durationSeconds: real("duration_seconds"),
    // Whether phones can play the link directly: it answers byte-range requests with an
    // audio/video type. When false, the player's audio is relayed through the site instead.
    streamDirect: boolean("stream_direct"),
    // Whether the link answers byte-range requests at all. Relaying a big video only works
    // when it does (otherwise every jump would mean reading the file from the start).
    byteRanges: boolean("byte_ranges"),
    // What we read from the file itself: the songs on a call list, the cards in a scorecards PDF.
    meta: jsonb("meta").$type<FileMeta>(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("files_playlist_idx").on(t.playlistId)],
);

/**
 * Gives a customer access to a whole genre (categoryId set) or a single
 * playlist (playlistId set). Users with accessAll ignore grants.
 */
export const accessGrants = pgTable(
  "access_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    playlistId: uuid("playlist_id").references(() => playlists.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("access_grants_user_idx").on(t.userId)],
);

export const downloads = pgTable(
  "downloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("downloads_user_idx").on(t.userId), index("downloads_file_idx").on(t.fileId)],
);

export const enquiries = pgTable("enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default(""),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  message: text("message").notNull().default(""),
  isHandled: boolean("is_handled").notNull().default(false),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type LibraryFile = typeof files.$inferSelect;
export type FileKind = (typeof fileKind.enumValues)[number];
