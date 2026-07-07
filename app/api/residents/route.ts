import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "SECURITY");
  if (!user?.communityId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const residents = await db.resident.findMany({
    where: { communityId: user.communityId, isActive: true },
    orderBy: [{ unit: "asc" }],
    select: {
      id: true,
      name: true,
      unit: true,
      community: { select: { name: true } },
    },
  });
  return NextResponse.json(residents);
}
