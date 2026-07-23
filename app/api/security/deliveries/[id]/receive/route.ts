import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(req, "SECURITY");
  if (!user?.communityId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { receivedByName } = await req.json().catch(() => ({}));
  if (!receivedByName?.trim()) {
    return NextResponse.json({ error: "Falta el nombre de quien recibe" }, { status: 400 });
  }

  const delivery = await db.deliveryVisit.findUnique({
    where: { id },
    include: { resident: true },
  });
  if (!delivery || delivery.resident.communityId !== user.communityId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (delivery.receivedAt) {
    return NextResponse.json({ error: "Ya fue marcada como recibida" }, { status: 400 });
  }

  const updated = await db.deliveryVisit.update({
    where: { id },
    data: { receivedAt: new Date(), receivedByName: receivedByName.trim(), receivedByUserId: user.id },
  });

  return NextResponse.json(updated);
}
