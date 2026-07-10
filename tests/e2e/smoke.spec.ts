import { test, expect } from "@playwright/test";

/**
 * Example specs — use these as the template for your own test cases.
 *
 * Every run starts from the seeded demo data (prisma/seed.ts):
 *   community "Sunset Hills" · admin/admin123 · security/security123 ·
 *   superadmin/super123 · resident tokens res-101-maria, res-202-carlos, res-305-ana
 *
 * Handy commands:
 *   npm run test:e2e        run the whole suite headless
 *   npm run test:e2e:ui     visual runner with time-travel debugging
 *   npx playwright codegen http://localhost:3000   record clicks into a test skeleton
 */

test("landing page shows the three portals", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "GatePass" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Portal de Seguridad/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Administración de Comunidad/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Súper Admin/ })).toBeVisible();
});

test("security guard can sign in and reach the gate screen", async ({ page }) => {
  await page.goto("/security/login");

  // The login form labels aren't wired to inputs with htmlFor, so target
  // placeholders / input types instead of getByLabel. UI text is Mexican
  // Spanish (see AGENTS.md) — match the rendered copy, not the English gloss.
  await page.getByPlaceholder("security").fill("security");
  await page.locator('input[type="password"]').fill("security123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/security$/);
  await expect(
    page.getByPlaceholder("Código de 6 caracteres o enlace del pase")
  ).toBeVisible();
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/security/login");

  await page.getByPlaceholder("security").fill("security");
  await page.locator('input[type="password"]').fill("wrong-password");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/security\/login$/);
  await expect(page.locator("p.text-red-400")).toBeVisible();
});
