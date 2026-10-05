import { test as base, expect, Page, JSHandle } from '@playwright/test';

type DialogHandle = JSHandle<Dialog>;

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

		return dialog as DialogHandle;
	}

	async installApp(id = 'cube', name = 'Cube', path = './Applications/Cube/cube.html') {
		await this.page.evaluate(({ path, name, id }) => {
			window.windowManager.installApp(path, name, id);
		}, { path, name, id });

		return this.getWindow(id);
	}

	async assertAppInstalled(windowId: string) {
		await this.getWindow(windowId);
	}

	async assertWindowOpen(window: DialogHandle) {
		const open = await window.evaluate(window =>
			window.isOpen === true
		);

		expect(open).toBe(true);
	}

	async assertWindowClosed(window: DialogHandle) {
		const open = await window.evaluate(window =>
			window.isOpen === true
		);

		expect(open).toBe(false);
	}

	async assertWindowMaximized(window: DialogHandle) {
		const maximized = await window.evaluate(window =>
			window.maximized === true
		);

		expect(maximized).toBe(true);
	}

	async assertWindowNotMaximized(window: DialogHandle) {
		const maximized = await window.evaluate(window =>
			window.maximized === true
		);

		expect(maximized).toBe(false);
	}

	openWindow = async (window: DialogHandle) => window.evaluate(dialog => dialog.open());
	launchWindow = async (window: DialogHandle) => window.evaluate(dialog => dialog.launch());

	async maximizeWindow(window: DialogHandle) {
		await window.evaluate(window => {
			window.maximize();
		});

		await this.page.waitForFunction(window =>
			window.maximized === true,
			window
		);
	}

	async unmaximizeWindow(window: DialogHandle) {
		await window.evaluate(window => window.toggleMaximized(false));

		await this.page.waitForFunction(window =>
			window.maximized === false,
			window
		);
	}

	async closeWindow(window: DialogHandle) {
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
		await page.addInitScript(() => {
			window.flags.useAnimations = false;
		});
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
	await vulpOS.installApp('cube', 'Cube');
});

test('should maximize and close an app', async ({ vulpOS }) => {
	const window = await vulpOS.installApp('cube', 'Cube');

	await vulpOS.launchWindow(window);
	await vulpOS.assertWindowOpen(window);

	await vulpOS.maximizeWindow(window);
	await vulpOS.assertWindowMaximized(window);

	await vulpOS.unmaximizeWindow(window);
	await vulpOS.assertWindowNotMaximized(window);

	await vulpOS.closeWindow(window);
	await vulpOS.assertWindowClosed(window);
});