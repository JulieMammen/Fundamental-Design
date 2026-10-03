import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Initialize database connection
 *
 * This creates a connection to your Neon PostgreSQL database
 * using the DATABASE_URL from environment variables
 *
 * Usage in other files:
 * import { db } from "@/db"
 * const users = await db.select().from(schema.users)
 */
const database = process.env.DATABASE_URL;

if (!database) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const db = drizzle(neon(database), { schema });
