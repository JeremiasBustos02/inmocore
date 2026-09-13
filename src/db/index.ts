import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to connect to the database.");
}

const client = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: "require",
});

export const db = drizzle(client, { schema });
