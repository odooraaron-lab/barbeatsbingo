import { defineConfig } from "drizzle-kit";
import { findDatabaseUrl } from "./scripts/database-url.mjs";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: findDatabaseUrl()?.url ?? "",
  },
});
