import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const securityUsers = await db.user.findMany({
    where: { communityId: user.communityId, role: "SECURITY" },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, createdAt: true },
  });

  return NextResponse.json(securityUsers);
}

export async function POST(req: NextRequest) {
  const user = await requireRole(req, "COMMUNITY_ADMIN");
  if (!user?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, password } = await req.json();
  if (!username?.trim() || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  try {
    const created = await db.user.create({
      data: {
        username: username.trim(),
        passwordHash: await hashPassword(password),
        role: "SECURITY",
        communityId: user.communityId,
      },
      select: { id: true, username: true, createdAt: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username is already taken" },
        { status: 409 }
      );
    }
    throw err;
  }
}
