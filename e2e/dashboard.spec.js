import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Lens/);
});

test('shows dashboard header', async ({ page }) => {
  await page.goto('/');
  
  // Wait for network requests or rendering if necessary
  await page.waitForLoadState('networkidle');

  // Assuming there is an h1 with the Lens logo text or an element like that
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible();
});
