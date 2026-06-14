import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const community = await prisma.community.upsert({
    where: { slug: "sunset-hills" },
    update: {},
    create: {
      name: "Sunset Hills",
      slug: "sunset-hills",
      residents: {
        create: [
          { name: "Maria Lopez", unit: "101", token: "res-101-maria" },
          { name: "Carlos Ruiz", unit: "202", token: "res-202-carlos" },
          { name: "Ana Torres", unit: "305", token: "res-305-ana" },
        ],
      },
    },
  });

  console.log(`Seeded community: ${community.name}`);
  console.log("\nResident links:");
  console.log("  http://localhost:3000/resident/res-101-maria  (Unit 101 - Maria)");
  console.log("  http://localhost:3000/resident/res-202-carlos (Unit 202 - Carlos)");
  console.log("  http://localhost:3000/resident/res-305-ana    (Unit 305 - Ana)");
  console.log("\nSecurity portal: http://localhost:3000/security");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
