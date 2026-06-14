import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateShortCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return code;
}

async function uniqueShortCode(): Promise<string> {
  let code: string;
  do {
    code = generateShortCode();
  } while (await db.guestPass.findUnique({ where: { shortCode: code } }));
  return code;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { residentId, guestName, entryType, totalPersons, vehiclePlate, carBrand, carModel, carColor } = body;

  if (!residentId || !guestName || !entryType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resident = await db.resident.findUnique({ where: { id: residentId } });
  if (!resident) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  const shortCode = await uniqueShortCode();
  const now = new Date();

  const pass = await db.guestPass.create({
    data: {
      residentId,
      shortCode,
      entryType,
      guestName,
      totalPersons: Number(totalPersons) || 1,
      validFrom: now,
      validTo: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      vehiclePlate: vehiclePlate || null,
      carBrand: carBrand || null,
      carModel: carModel || null,
      carColor: carColor || null,
    },
  });

  const entry = await db.entry.create({
    data: { guestPassId: pass.id },
  });

  return NextResponse.json({ pass, entry, resident }, { status: 201 });
}
