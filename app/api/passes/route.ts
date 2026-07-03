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
  const {
    residentToken, entryType, guestName, totalPersons,
    vehiclePlate, carBrand, carModel, carColor,
    guestNames,
  } = body;

  if (!residentToken || !entryType || !guestName || !totalPersons) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resident = await db.resident.findUnique({
    where: { token: residentToken },
    include: { community: { select: { isActive: true } } },
  });
  if (!resident) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }
  if (!resident.community.isActive) {
    return NextResponse.json(
      { error: "This community is currently disabled. Contact the program administrator." },
      { status: 403 }
    );
  }
  if (!resident.isActive) {
    return NextResponse.json(
      {
        error: "Your access has been disabled by your community admin.",
        disabledNote: resident.disabledNote,
      },
      { status: 403 }
    );
  }

  const shortCode = await uniqueShortCode();

  const pass = await db.guestPass.create({
    data: {
      residentId: resident.id,
      shortCode,
      entryType,
      guestName,
      totalPersons: Number(totalPersons),
      validFrom: new Date(),
      validTo: new Date(Date.now() + 2 * 60 * 60 * 1000),
      vehiclePlate: vehiclePlate || null,
      carBrand: carBrand || null,
      carModel: carModel || null,
      carColor: carColor || null,
      guestNames: guestNames?.length ? JSON.stringify(guestNames) : null,
    },
  });

  return NextResponse.json(pass, { status: 201 });
}
