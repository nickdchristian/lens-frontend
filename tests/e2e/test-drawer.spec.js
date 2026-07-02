import { test, expect } from "@playwright/test";

test("click hamburger without force", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  const btn = page.locator("#mobile-menu-btn");
  await btn.waitFor();
  await btn.click(); // no force

  const sidebar = page.locator(".sidebar");
  await expect(sidebar).toHaveClass(/open/);
});
