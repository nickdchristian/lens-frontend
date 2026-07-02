import { test, expect } from "@playwright/test";

test("click hamburger without force", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.route("**/api/v1/events**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/repositories")) {
      await route.fulfill({ json: ["test-org/repo-a"] });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("apiHost", "");
  });

  await page.goto("/");

  const btn = page.locator("#mobile-menu-btn");
  await btn.waitFor();
  await btn.click(); // no force

  const sidebar = page.locator("lens-sidebar");
  await expect(sidebar).toHaveClass(/open/);
});
