-- CreateTable
CREATE TABLE "DeliveryVisit" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "note" TEXT,
    "visitDate" DATE NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryVisit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeliveryVisit" ADD CONSTRAINT "DeliveryVisit_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryVisit" ADD CONSTRAINT "DeliveryVisit_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
