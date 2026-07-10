import { execSync } from "node:child_process";

/**
 * Runs once before the suite: resets the test database to a clean, seeded
 * state so every run starts from the same data (see prisma/seed.ts for the
 * demo community, users, and resident tokens the specs rely on).
 */
export default function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";

  // Second line of defense behind playwright.config.ts — `migrate reset`
  // drops the schema, so a non-local URL here must never get through.
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error(`Refusing to reset non-local database: ${url}`);
  }

  execSync("npx prisma migrate reset --force --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
