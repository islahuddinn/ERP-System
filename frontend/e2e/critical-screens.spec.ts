import { expect, test } from "@playwright/test";

const CRITICAL_SCREENS = [
  { name: "products", path: "/dashboard/products" },
  { name: "PO create", path: "/dashboard/purchases/create" },
  { name: "GRN create", path: "/dashboard/factory/receiving/create" },
  { name: "production complete", path: "/dashboard/production-orders?status=COMPLETED" },
  { name: "branch stock requests", path: "/dashboard/sales/branch-stock-requests" },
  { name: "shop / customer orders", path: "/dashboard/sales/customer-orders" },
  { name: "POS history", path: "/dashboard/pos/history" },
  { name: "payroll", path: "/dashboard/hr/payroll" },
  { name: "roles", path: "/dashboard/settings/roles-permissions" },
] as const;

test.describe("critical screens", () => {
  test("login requires email, password, and tenant id", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#tenantId")).toBeVisible();
  });

  for (const screen of CRITICAL_SCREENS) {
    test(`unauthenticated visitor cannot open ${screen.name}`, async ({ page }) => {
      await page.goto(screen.path);
      await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#tenantId")).toBeVisible();
    });
  }
});
