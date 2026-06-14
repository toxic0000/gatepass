import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const resident = await db.resident.findUnique({
    where: { token },
    include: {
      community: true,
      guestPasses: {
        orderBy: { createdAt: "desc" },
        include: { entries: { orderBy: { enteredAt: "desc" } } },
      },
    },
  });

  if (!resident) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(resident);
}
