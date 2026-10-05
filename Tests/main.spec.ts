import { test as base, expect, Page } from '@playwright/test';

export class VulpOSTester {
	// Use readonly so the page instance is locked to this runner
	constructor(readonly page: Page) {}

	async assertWindowManagerExists() {
		const exists = await this.page.evaluate(() => typeof window.windowManager !== 'undefined');
		expect(exists).toBe(true);
	}

	async assertAppManagerExists() {
		const exists = await this.page.evaluate(() => typeof window.appManager !== 'undefined');
		expect(exists).toBe(true);
	}

	async installApp(id: string = 'cube', name: string = 'Cube', path: string = './Applications/Cube/cube.html') {
		// Everything involving 'window.windowManager' must happen inside the browser context
		await this.page.evaluate(({ path, name, id }) => {
			window.windowManager.installApp(path, name, id);
		}, { path, name, id });

		// Wait and assert that the window is successfully tracked in the DOM/State
		const isWindowTracked = await this.page.evaluate((windowId) => {
			return typeof window.windowManager.windows[windowId] !== 'undefined';
		}, id);

		expect(isWindowTracked).toBe(true);
	}
}

const test = base.extend<{ vulpOS: VulpOSTester }>({
  vulpOS: async ({ page }, use) => {
    await page.goto('http://localhost:3621/'); 
    
    await use(new VulpOSTester(page));
  },
});

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