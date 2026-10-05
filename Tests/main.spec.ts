import { test as base, expect, Page } from '@playwright/test';

export class VulpOSTester {
	constructor(readonly page: Page) {}

	async assertWindowManagerExists() {
		const exists = await this.page.evaluate(() =>
			typeof window.windowManager !== 'undefined'
		);
		expect(exists).toBe(true);
	}

	async assertAppManagerExists() {
		const exists = await this.page.evaluate(() =>
			typeof window.appManager !== 'undefined'
		);
		expect(exists).toBe(true);
	}

	async installApp(
		id: string = 'cube',
		name: string = 'Cube',
		path: string = './Applications/Cube/cube.html'
	) {
		await this.page.evaluate(({ path, name, id }) => {
			window.windowManager.installApp(path, name, id);
		}, { path, name, id });

		await this.assertWindowExists(id);

		return id;
	}

	async assertWindowExists(windowId: string) {
		const exists = await this.page.evaluate((windowId) =>
			typeof window.windowManager.windows[windowId] !== 'undefined'
		, windowId);

		expect(exists).toBe(true);
	}

	async assertWindowOpen(windowId: string) {
		const open = await this.page.evaluate((windowId) =>
			window.windowManager.windows[windowId]?.isOpen === true
		, windowId);

		expect(open).toBe(true);
	}

	async assertWindowClosed(windowId: string) {
		const open = await this.page.evaluate((windowId) =>
			window.windowManager.windows[windowId]?.isOpen === true
		, windowId);

		expect(open).toBe(false);
	}

	async assertWindowMaximized(windowId: string) {
		const maximized = await this.page.evaluate((windowId) =>
			window.windowManager.windows[windowId]?.maximized === true
		, windowId);

		expect(maximized).toBe(true);
	}

	async assertWindowNotMaximized(windowId: string) {
		const maximized = await this.page.evaluate((windowId) =>
			window.windowManager.windows[windowId]?.maximized === true
		, windowId);

		expect(maximized).toBe(false);
	}

	async maximizeWindow(windowId: string) {
		await this.page.evaluate((windowId) => {
			window.windowManager.windows[windowId]?.maximize();
		}, windowId);

		await this.page.waitForFunction((windowId) =>
			window.windowManager.windows[windowId]?.maximized === true
		, windowId);
	}

	async unmaximizeWindow(windowId: string) {
		await this.page.evaluate((windowId) => {
			window.windowManager.windows[windowId]?.toggleMaximized(false);
		}, windowId);

		await this.page.waitForFunction((windowId) =>
			window.windowManager.windows[windowId]?.maximized === false
		, windowId);
	}

	async closeWindow(windowId: string) {
		await this.page.evaluate((windowId) => {
			window.windowManager.windows[windowId]?.close();
		}, windowId);

		await this.page.waitForFunction((windowId) =>
			window.windowManager.windows[windowId]?.isOpen === false
		, windowId);
	}
}

const test = base.extend<{ vulpOS: VulpOSTester }>({
	vulpOS: async ({ page }, use) => {
		await page.goto('http://localhost:3621/');
		await use(new VulpOSTester(page));
	},
});

test('should verify the global windowManager object', async ({ vulpOS }) =>
	vulpOS.assertWindowManagerExists()
);

test('should verify the global appManager object', async ({ vulpOS }) =>
	vulpOS.assertAppManagerExists()
);

test('should install an app', async ({ vulpOS }) => {
	const windowId = await vulpOS.installApp('cube', 'Cube');

	await vulpOS.assertWindowExists(windowId);
	await vulpOS.assertWindowOpen(windowId);
});

test('should maximize and close an app', async ({ vulpOS }) => {
	const windowId = await vulpOS.installApp('cube', 'Cube');

	await vulpOS.assertWindowOpen(windowId);

	await vulpOS.maximizeWindow(windowId);
	await vulpOS.assertWindowMaximized(windowId);

	await vulpOS.unmaximizeWindow(windowId);
	await vulpOS.assertWindowNotMaximized(windowId);

	await vulpOS.closeWindow(windowId);
	await vulpOS.assertWindowClosed(windowId);
});