import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "SECURITY");
  if (!user?.communityId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const today = dateParam ? new Date(dateParam) : new Date();

  const deliveries = await db.deliveryVisit.findMany({
    where: {
      receivedAt: null,
      visitDate: { lte: today },
      resident: { communityId: user.communityId },
    },
    orderBy: { visitDate: "asc" },
    include: { resident: true },
  });

  return NextResponse.json(deliveries);
}
