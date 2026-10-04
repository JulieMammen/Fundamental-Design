import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const database = process.env.DATABASE_URL;

if (!database) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const db = drizzle(neon(database), { schema });
