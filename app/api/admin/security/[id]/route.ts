import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const target = await db.user.findUnique({ where: { id } });
  if (
    !target ||
    target.role !== "SECURITY" ||
    target.communityId !== user.communityId
  ) {
    return NextResponse.json(
      { error: "Security user not found" },
      { status: 404 }
    );
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
