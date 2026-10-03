/**
 * Database Seed Script
 *
 * This script populates the database with sample data for development.
 *
 * Run with: npx tsx scripts/seed.ts
 *
 * Why seed scripts?
 * - Provide consistent test data
 * - Speed up development (no manual data entry)
 * - Document what sample data looks like
 * - Easy to reset database to clean state
 */

import { db } from "@/db";
import { users, posts } from "@/db/schema";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Clear existing data (optional - be careful!)
    // await db.delete(posts);
    // await db.delete(users);

    // Sample users
    const sampleUsers = [
      { name: "Alice Johnson", email: "alice@example.com" },
      { name: "Bob Smith", email: "bob@example.com" },
      { name: "Carol White", email: "carol@example.com" },
    ];

    console.log(`📝 Creating ${sampleUsers.length} users...`);
    const createdUsers = await db
      .insert(users)
      .values(sampleUsers)
      .returning();

    console.log(`✅ Created ${createdUsers.length} users`);

    // Sample posts (linked to first user)
    const samplePosts = [
      {
        userId: createdUsers[0]!.id,
        title: "Getting Started with Next.js",
        content:
          "Learn how to build modern web applications with Next.js and TypeScript.",
      },
      {
        userId: createdUsers[0]!.id,
        title: "Understanding TypeScript",
        content:
          "A deep dive into TypeScript types, interfaces, and advanced features.",
      },
      {
        userId: createdUsers[1]!.id,
        title: "Database Design Patterns",
        content:
          "Best practices for designing scalable and maintainable databases.",
      },
    ];

    console.log(`📝 Creating ${samplePosts.length} posts...`);
    const createdPosts = await db
      .insert(posts)
      .values(samplePosts)
      .returning();

    console.log(`✅ Created ${createdPosts.length} posts`);

    console.log("\n✨ Seed completed successfully!");
    console.log(`
📊 Database now contains:
   - ${createdUsers.length} users
   - ${createdPosts.length} posts
    `);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

// Run the seed function
seed();
