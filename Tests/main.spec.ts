import { test as base, expect, Page, JSHandle } from '@playwright/test';

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

	async getWindow(windowId: string) {
		const dialog = await this.page.evaluateHandle((windowId) => window.windowManager.windows[windowId], windowId);

		expect(await dialog.evaluate(window => window !== undefined)).toBe(true);

		return dialog;
	}

	async installApp(
		id: string = 'cube',
		name: string = 'Cube',
		path: string = './Applications/Cube/cube.html'
	) {
		await this.page.evaluate(({ path, name, id }) => {
			window.windowManager.installApp(path, name, id);
		}, { path, name, id });

		return this.getWindow(id);
	}

	async assertWindowOpen(window: JSHandle) {
		const open = await window.evaluate(window =>
			window.isOpen === true
		);

		expect(open).toBe(true);
	}

	async assertWindowClosed(window: JSHandle) {
		const open = await window.evaluate(window =>
			window.isOpen === true
		);

		expect(open).toBe(false);
	}

	async assertWindowMaximized(window: JSHandle) {
		const maximized = await window.evaluate(window =>
			window.maximized === true
		);

		expect(maximized).toBe(true);
	}

	async assertWindowNotMaximized(window: JSHandle) {
		const maximized = await window.evaluate(window =>
			window.maximized === true
		);

		expect(maximized).toBe(false);
	}

	async openWindow(window: JSHandle<Dialog>) {
		await window.evaluate(dialog => dialog.open());
	}

	async maximizeWindow(window: JSHandle) {
		await window.evaluate(window => {
			window.maximize();
		});

		await this.page.waitForFunction(window =>
			window.maximized === true,
			window
		);
	}

	async unmaximizeWindow(window: JSHandle) {
		await window.evaluate(window => {
			window.toggleMaximized(false);
		});

		await this.page.waitForFunction(window =>
			window.maximized === false,
			window
		);
	}

	async closeWindow(window: JSHandle) {
		await window.evaluate(window => {
			window.close();
		});

		await this.page.waitForFunction(window =>
			window.isOpen === false,
			window
		);
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
	const window = await vulpOS.installApp('cube', 'Cube');

	await vulpOS.assertWindowOpen(window);
});

test('should maximize and close an app', async ({ vulpOS }) => {
	const window = await vulpOS.installApp('cube', 'Cube');

	window

	await vulpOS.assertWindowOpen(window);

	await vulpOS.maximizeWindow(window);
	await vulpOS.assertWindowMaximized(window);

	await vulpOS.unmaximizeWindow(window);
	await vulpOS.assertWindowNotMaximized(window);

	await vulpOS.closeWindow(window);
	await vulpOS.assertWindowClosed(window);
});