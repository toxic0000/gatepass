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
  const body = await req.json().catch(() => ({}));

  const pass = await db.guestPass.findUnique({
    where: { id },
    include: { resident: { select: { communityId: true } } },
  });
  if (!pass || pass.resident.communityId !== user.communityId) {
    return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });
  }

  const now = new Date();
  if (now < pass.validFrom || now > pass.validTo) {
    return NextResponse.json({ error: "El pase está fuera de su periodo de validez" }, { status: 403 });
  }

  const entry = await db.entry.create({
    data: {
      guestPassId: id,
      note: body.note ?? null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
