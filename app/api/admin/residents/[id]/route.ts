import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { isActive, disabledNote } = await req.json();

  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be true or false" },
      { status: 400 }
    );
  }

  const resident = await db.resident.findUnique({ where: { id } });
  if (!resident || resident.communityId !== user.communityId) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  // Re-enabling counts against the community limit again.
  if (isActive && !resident.isActive) {
    const activeCount = await db.resident.count({
      where: { communityId: user.communityId, isActive: true },
    });
    const limit = user.community!.maxResidents;
    if (activeCount >= limit) {
      return NextResponse.json(
        {
          error: `Resident limit reached (${activeCount}/${limit}). Disable another resident or ask the program administrator to raise the limit.`,
        },
        { status: 403 }
      );
    }
  }

  const updated = await db.resident.update({
    where: { id },
    data: isActive
      ? { isActive: true, disabledNote: null }
      : { isActive: false, disabledNote: disabledNote?.trim() || null },
    select: {
      id: true,
      name: true,
      unit: true,
      email: true,
      token: true,
      isActive: true,
      disabledNote: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}
