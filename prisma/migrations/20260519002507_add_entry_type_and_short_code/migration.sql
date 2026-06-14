/*
  Warnings:

  - Added the required column `shortCode` to the `GuestPass` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuestPass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortCode" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'car',
    "guestName" TEXT NOT NULL,
    "totalPersons" INTEGER NOT NULL DEFAULT 1,
    "vehiclePlate" TEXT,
    "carBrand" TEXT,
    "carModel" TEXT,
    "carColor" TEXT,
    "guestNames" TEXT,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestPass_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GuestPass" ("createdAt", "guestName", "id", "residentId", "validFrom", "validTo", "vehiclePlate") SELECT "createdAt", "guestName", "id", "residentId", "validFrom", "validTo", "vehiclePlate" FROM "GuestPass";
DROP TABLE "GuestPass";
ALTER TABLE "new_GuestPass" RENAME TO "GuestPass";
CREATE UNIQUE INDEX "GuestPass_shortCode_key" ON "GuestPass"("shortCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
