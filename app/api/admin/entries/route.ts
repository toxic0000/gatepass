import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const entries = await db.entry.findMany({
    where: { guestPass: { resident: { communityId: user.communityId } } },
    orderBy: { enteredAt: "desc" },
    take: 100,
    include: {
      guestPass: {
        select: {
          guestName: true,
          entryType: true,
          shortCode: true,
          totalPersons: true,
          resident: { select: { name: true, unit: true } },
        },
      },
    },
  });

  return NextResponse.json(entries);
}
