import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

/**
 * Users table - stores information about people using the system
 *
 * Each row represents one user with:
 * - Unique ID
 * - Name and email
 * - When they created their account
 * - When they last updated their profile
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Posts table - stores blog posts or articles
 *
 * Relationships:
 * - userId: Links to the user who created this post
 *
 * Stores:
 * - Post title and content
 * - When it was created and updated
 */
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
