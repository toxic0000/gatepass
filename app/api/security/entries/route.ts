import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "SECURITY");
  if (!user?.communityId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const entries = await db.entry.findMany({
    where: { guestPass: { resident: { communityId: user.communityId } } },
    take: 10,
    orderBy: { enteredAt: "desc" },
    include: {
      guestPass: {
        include: { resident: true },
      },
    },
  });
  return NextResponse.json(entries);
}
