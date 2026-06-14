import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let pass = await db.guestPass.findUnique({
    where: { id },
    include: {
      resident: { include: { community: true } },
      entries: { orderBy: { enteredAt: "desc" } },
    },
  });

  if (!pass) {
    pass = await db.guestPass.findUnique({
      where: { shortCode: id.toUpperCase() },
      include: {
        resident: { include: { community: true } },
        entries: { orderBy: { enteredAt: "desc" } },
      },
    });
  }

  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  return NextResponse.json(pass);
}
