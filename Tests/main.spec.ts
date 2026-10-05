import { test, expect } from '@playwright/test';



test('should verify the global windowManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	const wm = await page.evaluate(() => {

		return window.windowManager; 
	});

	expect(wm).toBeDefined();
	expect(wm.windowSnap).toBeDefined();
});

test('should verify the global appManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	const appManager = await page.evaluate((): AppManager => {

		return window.appManager; 
	});

	expect(appManager).toBeDefined();
});