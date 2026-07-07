import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(req, "SECURITY");
  if (!user?.communityId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const include = {
    resident: { include: { community: true } },
    entries: { orderBy: { enteredAt: "desc" as const } },
  };

  let pass = await db.guestPass.findUnique({ where: { id }, include });
  if (!pass) {
    pass = await db.guestPass.findUnique({
      where: { shortCode: id.toUpperCase() },
      include,
    });
  }

  // Passes from other communities look like they don't exist.
  if (!pass || pass.resident.communityId !== user.communityId) {
    return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });
  }

  return NextResponse.json(pass);
}
