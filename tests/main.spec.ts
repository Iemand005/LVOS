import { test, expect, Page } from '@playwright/test';

async function checkWelcomeMessage(page: Page, expectedText: string): Promise<void> {
  const header = page.locator('h1');
  await expect(header).toContainText(expectedText);
}

test('should load website and verify elements with TS', async ({ page }) => {
  await page.goto('https://localhost:3621');

  await expect(page).toHaveTitle(/Example Domain/);

  await checkWelcomeMessage(page, 'Example Domain');
});
