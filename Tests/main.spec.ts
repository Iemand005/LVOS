import { test, expect, Page } from '@playwright/test';

class VulpOSTester {

	async getWindowManager(page: Page) {
		const wm = await page.evaluate(() => window.windowManager);

		expect(wm).toBeDefined();
		return wm;
	}

	async getAppManager(page: Page) {
		const appManager = await page.evaluate(() => window.appManager);

		expect(appManager).toBeDefined();
		return appManager;
	}
}

const tester = new VulpOSTester();

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

	const appManager = tester.getAppManager(page);
});