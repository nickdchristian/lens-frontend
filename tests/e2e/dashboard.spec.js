import { test, expect } from "@playwright/test";

// Mock API response data
const mockEvents = [
  {
    id: 1,
    repository: "test-org/repo-a",
    timestamp: new Date().toISOString(),
    workflow_name: "Deploy Prod",
    tags: { env: "prod" },
    metrics: { deployment_count: 1 },
  },
  {
    id: 2,
    repository: "test-org/repo-b",
    timestamp: new Date().toISOString(),
    workflow_name: "Build",
    artifact: { name: "my-app", version: "v1.0" },
    metrics: { lead_time_minutes: 15 },
  },
];

const mockMetrics = [{ bucket: "2024-01-01", sum: 10 }];

test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => console.log(`BROWSER: ${msg.text()}`));

  // Mock API endpoints
  await page.route("**/api/v1/events**", async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("search");

    if (url.pathname.includes("metrics/aggregated")) {
      await route.fulfill({ json: { data: mockMetrics } });
    } else {
      let events = [...mockEvents];
      if (search) {
        events = events.filter(
          (e) =>
            e.repository.includes(search) || (e.tags && e.tags.env === search)
        );
      }
      console.log(
        `MOCK API: search=${search}, returning ${events.length} events`
      );
      await route.fulfill({ json: { status: "success", events } });
    }
  });

  // Set fake apiHost in localStorage so the app doesn't try to use relative paths
  // that might hit Playwright's local server incorrectly
  await page.addInitScript(() => {
    window.localStorage.setItem("apiHost", "http://mock-api");
  });

  await page.goto("/");
  // Wait for loading to finish (assuming a network request completes)
  await page.waitForLoadState("networkidle");
});

test.describe("Dashboard E2E", () => {
  test("shows dashboard header and global view", async ({ page }) => {
    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();

    const viewTitle = page.locator("#view-title");
    await expect(viewTitle).toHaveText("All Repositories");
  });

  test("sidebar interaction filters to repository view", async ({ page }) => {
    // Click on repo-a in sidebar
    const repoBtn = page.locator("button.nav-item", { hasText: "repo-a" });
    await repoBtn.click();

    // Verify title changes
    const viewTitle = page.locator("#view-title");
    await expect(viewTitle).toHaveText("test-org/repo-a");

    // The overview chart container should still be visible
    await expect(page.locator("lens-overview-charts")).toBeVisible();
  });

  test("switching to artifacts mode displays artifact trace", async ({
    page,
  }) => {
    // Click artifacts top nav tab
    await page.locator('a[href="/artifacts"]').first().click();

    // Wait for artifacts to populate in sidebar
    const artifactBtn = page.locator("button.group-header", {
      hasText: "MY-APP",
    });
    await expect(artifactBtn).toBeVisible();
    await artifactBtn.click();

    // Click the version
    const versionBtn = page.locator("button.nav-item", { hasText: "v1.0" });
    await versionBtn.click();

    // Verify artifact trace component is visible
    const traceContainer = page.locator("#artifact-trace-container");
    await expect(traceContainer).toBeVisible();

    // The web component should be present
    const traceComponent = page.locator("lens-artifact-trace");
    await expect(traceComponent).toBeVisible();
  });

  test("history search filters data grid", async ({ page }) => {
    // Go to history tab
    await page.locator('button[data-tab="history"]').click();

    // Verify both events are initially visible (2 events)
    const rows = page.locator("#data-table-body tr.grid-row-master");
    await expect(rows).toHaveCount(2);

    // Search for repo-a
    await page.locator("#history-search").fill("repo-a");

    // Now only 1 event should be visible
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("repo-a");
  });

  test("time period toggles", async ({ page }) => {
    // Check default active (Month)
    const monthBtn = page.locator("button.segment-btn", { hasText: "Month" });
    await expect(monthBtn).toHaveClass(/active/);

    // Click week
    const weekBtn = page.locator("button.segment-btn", { hasText: "Week" });
    await weekBtn.dispatchEvent("click");

    await expect(weekBtn).toHaveClass(/active/);
    await expect(monthBtn).not.toHaveClass(/active/);
  });
});
