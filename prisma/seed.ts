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
      maxResidents: 50,
      residents: {
        create: [
          { name: "Maria Lopez", unit: "101", token: "res-101-maria" },
          { name: "Carlos Ruiz", unit: "202", token: "res-202-carlos" },
          { name: "Ana Torres", unit: "305", token: "res-305-ana" },
        ],
      },
    },
  });

  const superPassword = process.env.SUPERADMIN_PASSWORD ?? "super123";
  await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      username: "superadmin",
      passwordHash: await hashPassword(superPassword),
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: await hashPassword("admin123"),
      role: "COMMUNITY_ADMIN",
      communityId: community.id,
    },
  });

  await prisma.user.upsert({
    where: { username: "security" },
    update: {},
    create: {
      username: "security",
      passwordHash: await hashPassword("security123"),
      role: "SECURITY",
      communityId: community.id,
    },
  });

  console.log(`Seeded community: ${community.name}`);
  console.log("\nResident links:");
  console.log("  http://localhost:3000/resident/res-101-maria  (Unit 101 - Maria)");
  console.log("  http://localhost:3000/resident/res-202-carlos (Unit 202 - Carlos)");
  console.log("  http://localhost:3000/resident/res-305-ana    (Unit 305 - Ana)");
  console.log("\nSecurity portal:  http://localhost:3000/security");
  console.log("  Username: security  |  Password: security123");
  console.log("\nAdmin portal:     http://localhost:3000/admin");
  console.log("  Username: admin  |  Password: admin123");
  console.log("\nSuper admin:      http://localhost:3000/superadmin");
  console.log(
    `  Username: superadmin  |  Password: ${
      process.env.SUPERADMIN_PASSWORD ? "(from SUPERADMIN_PASSWORD)" : "super123"
    }`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
