import { test, expect, Page } from '@playwright/test';

test('should verify the global windowManager object', async ({ page }) => {
  await page.goto('http://localhost:3621/');

  const managerData = await page.evaluate((): WindowManager => {
    // This block runs INSIDE the browser tab
    return (window as any).windowManager; 
  });

  expect(managerData).toBeDefined();
  expect(managerData.windowSnap).toBeDefined();
});