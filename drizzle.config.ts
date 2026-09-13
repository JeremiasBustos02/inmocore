import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(directDatabaseUrl
    ? { dbCredentials: { url: directDatabaseUrl } }
    : {}),
});
