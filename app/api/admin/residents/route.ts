import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifySessionToken, hashPassword, ADMIN_COOKIE } from "@/lib/admin-auth";

function getSession(req: NextRequest) {
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value ?? "");
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await db.communityAdmin.findUnique({
    where: { id: session.adminId },
    include: { community: true },
  });
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const residents = await db.resident.findMany({
    where: { communityId: admin.communityId },
    orderBy: [{ unit: "asc" }],
    select: { id: true, name: true, unit: true, email: true, token: true, createdAt: true },
  });

  return NextResponse.json({
    admin: { username: admin.username, community: { name: admin.community.name } },
    residents,
  });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await db.communityAdmin.findUnique({ where: { id: session.adminId } });
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, unit, email, password } = await req.json();

  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
  }

  const data: Prisma.ResidentCreateInput = {
    name: name.trim(),
    unit: unit.trim(),
    community: { connect: { id: admin.communityId } },
  };

  if (email?.trim()) {
    data.email = email.trim().toLowerCase();
  }
  if (password) {
    data.passwordHash = await hashPassword(password);
  }

  try {
    const resident = await db.resident.create({
      data,
      select: { id: true, name: true, unit: true, email: true, token: true, createdAt: true },
    });
    return NextResponse.json(resident, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    throw err;
  }
}
