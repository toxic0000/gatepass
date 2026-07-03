import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const residents = await db.resident.findMany({
    where: { communityId: user.communityId },
    orderBy: [{ unit: "asc" }],
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

  return NextResponse.json({
    admin: {
      username: user.username,
      community: {
        name: user.community!.name,
        maxResidents: user.community!.maxResidents,
      },
    },
    residents,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, unit, email } = await req.json();

  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json(
      { error: "Name and unit are required" },
      { status: 400 }
    );
  }

  const activeCount = await db.resident.count({
    where: { communityId: user.communityId, isActive: true },
  });
  const limit = user.community!.maxResidents;
  if (activeCount >= limit) {
    return NextResponse.json(
      {
        error: `Resident limit reached (${activeCount}/${limit}). Disable a resident or ask the program administrator to raise the limit.`,
      },
      { status: 403 }
    );
  }

  const resident = await db.resident.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      email: email?.trim() ? email.trim().toLowerCase() : null,
      communityId: user.communityId,
    },
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
  return NextResponse.json(resident, { status: 201 });
}
