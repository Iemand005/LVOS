import { test, expect, Page } from '@playwright/test';

test('should verify the global windowManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	const managerData = await page.evaluate((): WindowManager => {

		return (window as any).windowManager; 
	});

	expect(managerData).toBeDefined();
	expect(managerData.windowSnap).toBeDefined();
});