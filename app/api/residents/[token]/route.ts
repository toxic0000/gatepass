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
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (!resident.community.isActive) {
    return NextResponse.json(
      {
        error: "Esta comunidad está deshabilitada por el momento.",
        reason: "community_disabled",
        communityName: resident.community.name,
      },
      { status: 403 }
    );
  }

  if (!resident.isActive) {
    return NextResponse.json(
      {
        error: "El administrador de tu comunidad deshabilitó tu acceso.",
        reason: "resident_disabled",
        disabledNote: resident.disabledNote,
        residentName: resident.name,
        unit: resident.unit,
        communityName: resident.community.name,
      },
      { status: 403 }
    );
  }

  return NextResponse.json(resident);
}
