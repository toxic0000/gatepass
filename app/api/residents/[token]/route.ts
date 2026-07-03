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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!resident.community.isActive) {
    return NextResponse.json(
      {
        error: "This community is currently disabled.",
        reason: "community_disabled",
        communityName: resident.community.name,
      },
      { status: 403 }
    );
  }

  if (!resident.isActive) {
    return NextResponse.json(
      {
        error: "Your access has been disabled by your community admin.",
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
