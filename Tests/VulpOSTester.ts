import { test as base, expect, Page, JSHandle } from '@playwright/test';

export type DialogHandle = JSHandle<Dialog>;

/** A viewport point, which is all the pointer helpers speak. */
export type Point = { x: number; y: number };

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

	/** Install, launch and wait until the window exists to be measured. */
	async openCube() {
		const id = 'cube';
		const dialog = await this.installApp(id, 'Cube');

		await this.launchWindow(dialog);
		await this.assertWindowOpen(dialog);
		await this.page.waitForFunction((windowId) => {
			const target = window.windowManager.windows[windowId];
			return Boolean(target && target.target);
		}, id);

		return dialog;
	}

	/**
	 * Aero snap is off unless asked for. Its rAF throttle goes with it: it would queue
	 * the last move of a gesture behind a frame, so the drop could decide on a zone the
	 * indicator never put up.
	 */
	async enableAeroSnap() {
		await this.page.evaluate(() => {
			window.flags.aeroSnap = true;
			window.flags.updateRateLimit = false;
		});
	}

	/** The geometry the snap code stores, which the CSS layer deliberately leaves alone. */
	async state(window: DialogHandle) {
		return window.evaluate(window => ({
			snapped: window.snapped,
			heightSnapped: window.heightSnapped,
			maximized: window.maximized,
			x: window.x,
			y: window.y,
			width: window.width,
			height: window.height,
		}));
	}

	/** The boxes on screen: the window itself, and the area every snap lays out against. */
	async measure(window: DialogHandle) {
		return window.evaluate(window => {
			const rect = window.target!.getBoundingClientRect();
			const section = document.getElementById('window-section');
			const area = section ? section.getBoundingClientRect() : rect;

			return {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
				sectionX: area.x,
				sectionY: area.y,
				sectionWidth: area.width,
				sectionHeight: area.height,
			};
		});
	}

	/**
	 * Whether the snap indicator is offering anything right now. It starts out as a
	 * border-only shell rather than a hidden one, so its size is part of the answer
	 * as much as the class is.
	 */
	async snapIndicatorShown() {
		return this.page.evaluate(() => {
			const element = document.getElementById('window-snap');
			if (!element || element.classList.contains('hidden')) return false;

			const rect = element.getBoundingClientRect();
			return rect.width > 10 && rect.height > 10;
		});
	}

	/**
	 * Somewhere on the title bar a drag will actually start from: it refuses to begin
	 * on a button, and the title bar is mostly buttons, so walk the middle of it for a
	 * stretch that is clear of them. Kept off the ends so the edge sizers are not hit.
	 */
	async titleBarPoint(window: DialogHandle) {
		return window.evaluate(window => {
			const bar = window.titleBar || window.target!;
			const rect = bar.getBoundingClientRect();
			const y = rect.y + rect.height / 2;

			for (let i = 6; i <= 14; i++) {
				const x = rect.x + (rect.width * i) / 20;
				const under = document.elementFromPoint(x, y);
				const interactive = under && under.closest('button, a, input, select, label, output, [contenteditable]');

				if (under && bar.contains(under) && !interactive) return { x, y };
			}

			throw new Error('No draggable spot on the title bar');
		});
	}

	/** The centre of a resize sizer: 1 top, 2 right, 3 bottom, 4 left. */
	async sizerPoint(window: DialogHandle, direction: number) {
		return window.evaluate((window, direction) => {
			const target = window.target!;
			const sizer = target.querySelector<HTMLElement>('.sizer-' + direction);
			const rect = sizer ? sizer.getBoundingClientRect() : target.getBoundingClientRect();

			return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
		}, direction);
	}

	async grabAt(point: Point) {
		await this.page.mouse.move(point.x, point.y);
		await this.page.mouse.down();
	}

	async moveTo(point: Point) {
		await this.page.mouse.move(point.x, point.y, { steps: 12 });
	}

	async release() {
		await this.page.mouse.up();
	}

	/** A whole gesture: press at `from`, drag to `to`, let go. */
	async drag(from: Point, to: Point) {
		await this.grabAt(from);
		await this.moveTo(to);
		await this.release();
	}
}

export const test = base.extend<{ vulpOS: VulpOSTester }>({
	vulpOS: async ({ page }, use) => {

		await page.goto('http://localhost:3621/');

		await page.evaluate(() => {
			window.flags.useAnimations = false;
		});

		await use(new VulpOSTester(page));
	},
});

export { expect };
