import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { FileMeta } from "../lib/file-meta";
import type { SyncState } from "../lib/show-sync";

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
/** How hard a show is to win, shown to customers next to its name. */
export const showDifficulty = pgEnum("show_difficulty", ["easy", "medium", "hard"]);

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
  // Whether they may play shows on the site (player, call list, bingo checker). Admins always can.
  // Off for new customers until an admin ticks it; existing ones keep theirs.
  canPlay: boolean("can_play").notNull().default(false),
  // Their own choice on show pages: the player and checker shown, or just the downloads.
  // Off for new customers (they switch it on from a show page); existing ones keep theirs.
  playMode: boolean("play_mode").notNull().default(false),
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
    // Not set until an admin picks one.
    difficulty: showDifficulty("difficulty"),
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

/**
 * Where a customer's game of a show is up to, shared by every device they have the show
 * open on: one plays the sound, the others follow (and can pause it or move it on).
 */
export const showSyncs = pgTable(
  "show_syncs",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    state: jsonb("state").$type<SyncState>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.playlistId] })],
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
export type Difficulty = (typeof showDifficulty.enumValues)[number];

/**
 * Album covers for songs on call lists, looked up once from a music catalogue and kept.
 * `imageUrl` is null when no confident match was found (so it isn't looked up again).
 */
export const songArt = pgTable("song_art", {
  // Artist and title, lower-cased and simplified, e.g. "prince|little red corvette".
  key: text("key").primaryKey(),
  artist: text("artist").notNull(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  source: text("source"),
  lookedUpAt: timestamp("looked_up_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityKind = pgEnum("activity_kind", [
  "downloaded",
  "guide_downloaded",
  "login",
  "login_failed",
  "show_viewed",
  "show_played",
  "searched",
  "category_requested",
  "password_changed",
  "password_reset",
  "play_mode_changed",
]);
export type ActivityKind = (typeof activityKind.enumValues)[number];

/**
 * What a customer has done on the site, for their page in the admin. Names are copied in
 * (`detail`), so the history still reads right after a show or file is renamed or deleted.
 */
export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: activityKind("kind").notNull(),
    playlistId: uuid("playlist_id").references(() => playlists.id, { onDelete: "set null" }),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    // The show's name, the file's title, the words searched for, the category asked for…
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_user_idx").on(t.userId, t.createdAt), index("activity_user_kind_idx").on(t.userId, t.kind, t.createdAt)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * Files the site serves that aren't part of a show, kept in the database so they're never
 * in the (public) code, e.g. the host guide customers download from the portal.
 */
export const siteFiles = pgTable("site_files", {
  key: text("key").primaryKey(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  data: bytea("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Instagram posts by venues using Bar Beats Bingo, linked from the bottom of the home page. */
export const socialPosts = pgTable("social_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The post's link, tidied to https://www.instagram.com/reel/<code>/ (or /p/…).
  url: text("url").notNull().unique(),
  // The account that posted it, without the @, if known.
  handle: text("handle").notNull().default(""),
  caption: text("caption").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  ...timestamps,
});
