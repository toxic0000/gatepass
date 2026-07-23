import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { residentToken, company, note, visitDate } = body;

  if (!residentToken || !company || !visitDate) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const resident = await db.resident.findUnique({
    where: { token: residentToken },
    include: { community: { select: { isActive: true } } },
  });
  if (!resident) {
    return NextResponse.json({ error: "Residente no encontrado" }, { status: 404 });
  }
  if (!resident.community.isActive) {
    return NextResponse.json(
      { error: "Esta comunidad está deshabilitada por el momento. Contacta al administrador del programa." },
      { status: 403 }
    );
  }
  if (!resident.isActive) {
    return NextResponse.json(
      {
        error: "El administrador de tu comunidad deshabilitó tu acceso.",
        disabledNote: resident.disabledNote,
      },
      { status: 403 }
    );
  }

  const delivery = await db.deliveryVisit.create({
    data: {
      residentId: resident.id,
      company,
      note: note || null,
      visitDate: new Date(visitDate),
    },
  });

  return NextResponse.json(delivery, { status: 201 });
}
