import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const entries = await db.entry.findMany({
    take: 10,
    orderBy: { enteredAt: "desc" },
    include: {
      guestPass: {
        include: { resident: true },
      },
    },
  });
  return NextResponse.json(entries);
}
