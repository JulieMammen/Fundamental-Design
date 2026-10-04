import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { csvUploads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileName, headers, data, testColumn, valueColumn, unitColumn } = body;

    if (!fileName || !headers || !data) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(csvUploads)
      .values({
        userId,
        fileName,
        headers,
        data,
        testColumn,
        valueColumn,
        unitColumn,
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error saving CSV:", error);
    return NextResponse.json(
      { error: "Failed to save CSV" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const uploads = await db
      .select()
      .from(csvUploads)
      .where(eq(csvUploads.userId, userId))
      .orderBy(csvUploads.createdAt);

    return NextResponse.json(uploads);
  } catch (error) {
    console.error("Error fetching CSVs:", error);
    return NextResponse.json(
      { error: "Failed to fetch CSVs" },
      { status: 500 }
    );
  }
}
