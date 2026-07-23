import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { residentToken } = await req.json().catch(() => ({}));
  if (!residentToken) {
    return NextResponse.json({ error: "Falta el token del residente" }, { status: 400 });
  }

  const delivery = await db.deliveryVisit.findUnique({
    where: { id },
    include: { resident: true },
  });
  if (!delivery || delivery.resident.token !== residentToken) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (delivery.receivedAt) {
    return NextResponse.json({ error: "Esta entrega ya fue recibida" }, { status: 400 });
  }

  await db.deliveryVisit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
