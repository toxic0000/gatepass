import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(req: NextRequest) {
  const user = await requireRole(req, "SUPER_ADMIN");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communities = await db.community.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      users: { select: { role: true } },
      _count: { select: { residents: { where: { isActive: true } } } },
    },
  });

  return NextResponse.json({
    user: { username: user.username },
    communities: communities.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      maxResidents: c.maxResidents,
      isActive: c.isActive,
      createdAt: c.createdAt,
      counts: {
        residents: c._count.residents,
        admins: c.users.filter((u) => u.role === "COMMUNITY_ADMIN").length,
        security: c.users.filter((u) => u.role === "SECURITY").length,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireRole(req, "SUPER_ADMIN");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, maxResidents, adminUsername, adminPassword } = await req.json();

  if (!name?.trim() || !adminUsername?.trim() || !adminPassword) {
    return NextResponse.json(
      { error: "Community name, admin username and admin password are required" },
      { status: 400 }
    );
  }
  const limit = Number(maxResidents);
  if (!Number.isInteger(limit) || limit < 1) {
    return NextResponse.json(
      { error: "Max residents must be a positive number" },
      { status: 400 }
    );
  }

  const baseSlug = slugify(name) || "community";
  const taken = await db.community.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const takenSlugs = new Set(taken.map((c) => c.slug));
  let slug = baseSlug;
  for (let i = 2; takenSlugs.has(slug); i++) slug = `${baseSlug}-${i}`;

  try {
    const community = await db.community.create({
      data: {
        name: name.trim(),
        slug,
        maxResidents: limit,
        users: {
          create: {
            username: adminUsername.trim(),
            passwordHash: await hashPassword(adminPassword),
            role: "COMMUNITY_ADMIN",
          },
        },
      },
    });
    return NextResponse.json(community, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That admin username is already taken" },
        { status: 409 }
      );
    }
    throw err;
  }
}
