import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Unauthenticated on purpose: this is what the shared pass link / QR code
// resolves to for the guest, who has no session. Only guest-facing fields
// are returned — no resident id, entries, or other tenant internals.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pass = await db.guestPass.findUnique({
    where: { id },
    include: { resident: { include: { community: true } } },
  });

  if (!pass) {
    return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: pass.id,
    shortCode: pass.shortCode,
    entryType: pass.entryType,
    guestName: pass.guestName,
    totalPersons: pass.totalPersons,
    vehiclePlate: pass.vehiclePlate,
    carBrand: pass.carBrand,
    carModel: pass.carModel,
    carColor: pass.carColor,
    guestNames: pass.guestNames,
    validFrom: pass.validFrom,
    validTo: pass.validTo,
    community: { name: pass.resident.community.name },
    unit: pass.resident.unit,
  });
}
