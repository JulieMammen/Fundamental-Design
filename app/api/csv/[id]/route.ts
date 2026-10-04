import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { csvUploads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const upload = await db
      .select()
      .from(csvUploads)
      .where(
        and(
          eq(csvUploads.id, id),
          eq(csvUploads.userId, userId)
        )
      );

    if (!upload.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(upload[0]);
  } catch (error) {
    console.error("Error fetching CSV:", error);
    return NextResponse.json(
      { error: "Failed to fetch CSV" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db
      .delete(csvUploads)
      .where(
        and(
          eq(csvUploads.id, id),
          eq(csvUploads.userId, userId)
        )
      )
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting CSV:", error);
    return NextResponse.json(
      { error: "Failed to delete CSV" },
      { status: 500 }
    );
  }
}
