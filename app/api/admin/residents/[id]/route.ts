import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/admin-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value ?? "");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await db.communityAdmin.findUnique({ where: { id: session.adminId } });
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const resident = await db.resident.findUnique({ where: { id } });
  if (!resident || resident.communityId !== admin.communityId) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  await db.resident.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
