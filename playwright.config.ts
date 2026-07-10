import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Load .env.test without adding a dotenv dependency. Values already present in
// process.env win (CI sets DATABASE_URL itself; Prisma and Next behave the same way).
const envPath = path.join(__dirname, ".env.test");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !m[1].startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2];
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL ?? "";

// The repo's .env points at the PRODUCTION database. E2E tests wipe and reseed
// whatever DATABASE_URL targets, so anything that isn't clearly local is fatal.
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL)) {
  throw new Error(
    "Refusing to run E2E tests: DATABASE_URL does not point at localhost. " +
      "Start the test database (npm run test:db) and keep .env.test local-only."
  );
}

// Dedicated port so tests never collide with (or run against) a normal
// `npm run dev` session on 3000, which uses the production .env.
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // specs share one seeded DB; keep runs deterministic
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["github"]] : [["html"], ["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // CI builds first and serves the production bundle; locally the dev server
    // keeps the edit-test loop fast.
    command: process.env.CI
      ? `npx next start -p ${PORT}`
      : `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Explicit override beats the .env file Next would otherwise load.
      DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-test-secret",
    },
  },
});
