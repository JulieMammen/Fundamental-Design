import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

/**
 * GET /api/users
 *
 * Fetches all users from the database
 *
 * HTTP Request Examples:
 * - curl http://localhost:3000/api/users
 * - fetch('http://localhost:3000/api/users').then(r => r.json())
 *
 * Returns:
 * {
 *   "success": true,
 *   "data": [
 *     { "id": "123", "name": "John", "email": "john@example.com", ... }
 *   ]
 * }
 */
export async function GET() {
  try {
    // Query the users table
    const allUsers = await db.select().from(users);

    return NextResponse.json({
      success: true,
      data: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 *
 * Creates a new user in the database
 *
 * Request body:
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com"
 * }
 *
 * Returns the created user with ID and timestamps
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Insert new user into database
    const newUser = await db
      .insert(users)
      .values({
        name,
        email,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: newUser[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);

    // Handle duplicate email error
    if (isDuplicateEmailError(error)) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}
