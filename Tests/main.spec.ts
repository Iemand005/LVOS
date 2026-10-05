import { test, expect, Page } from '@playwright/test';

class VulpOSTester {

	async getWindowManager(page: Page) {
		const windowManager = await page.evaluate(() => window.windowManager);

		expect(windowManager).toBeDefined();
		return windowManager;
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

	tester.getWindowManager(page);
});

test('should verify the global appManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	tester.getAppManager(page);
});

test('should verify windowManager app installation', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	// const wm = await tester.getWindowManager(page);

	// wm.()
	const appManager = await tester.getAppManager(page);
	appManager.installedApps
});