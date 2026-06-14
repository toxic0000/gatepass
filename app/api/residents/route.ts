import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const residents = await db.resident.findMany({
    include: { community: true },
    orderBy: [{ unit: "asc" }],
  });
  return NextResponse.json(residents);
}
