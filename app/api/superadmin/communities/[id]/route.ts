import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole(req, "SUPER_ADMIN");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Prisma.CommunityUpdateInput = {};
  if (body.maxResidents !== undefined) {
    const limit = Number(body.maxResidents);
    if (!Number.isInteger(limit) || limit < 1) {
      return NextResponse.json(
        { error: "Max residents must be a positive number" },
        { status: 400 }
      );
    }
    data.maxResidents = limit;
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const community = await db.community.update({ where: { id }, data });
    return NextResponse.json(community);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    throw err;
  }
}
