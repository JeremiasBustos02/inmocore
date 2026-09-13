import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(directDatabaseUrl
    ? { dbCredentials: { url: directDatabaseUrl } }
    : {}),
});