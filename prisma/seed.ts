import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

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

  const passwordHash = await hashPassword("admin123");
  await prisma.communityAdmin.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      communityId: community.id,
    },
  });

  console.log(`Seeded community: ${community.name}`);
  console.log("\nResident links:");
  console.log("  http://localhost:3000/resident/res-101-maria  (Unit 101 - Maria)");
  console.log("  http://localhost:3000/resident/res-202-carlos (Unit 202 - Carlos)");
  console.log("  http://localhost:3000/resident/res-305-ana    (Unit 305 - Ana)");
  console.log("\nSecurity portal: http://localhost:3000/security");
  console.log("\nAdmin portal:    http://localhost:3000/admin");
  console.log("  Username: admin  |  Password: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
