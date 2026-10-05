import { test, expect, Page } from '@playwright/test';

class VulpOSTester {

	constructor(readonly page: Page) {}

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

	async windowManagerInstallApp(page: Page) {
		const wm = await this.getWindowManager(page);

		const id = "cube";

		wm.installApp("./Applications/Cube/cube.html", "Cube", id);

		expect(wm.windows[id]).toBeDefined();

		return wm.windows[id];
	}
}

const tester = new VulpOSTester();

test('should verify the global windowManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	await tester.getWindowManager(page);
});

test('should verify the global appManager object', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	await tester.getAppManager(page);
});

test('should verify windowManager app installation', async ({ page }) => {
	await page.goto('http://localhost:3621/');

	const app = await tester.windowManagerInstallApp(page);
});