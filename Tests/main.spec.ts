import { test, expect, Page } from '@playwright/test';

test('should verify the global windowManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	const wm = await page.evaluate((): WindowManager => {

		return (window as any).windowManager; 
	});

	expect(wm).toBeDefined();
	expect(wm.windowSnap).toBeDefined();

	expect(wm.windows.calculator).toBeDefined();
});