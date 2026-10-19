import { test, expect, DialogHandle } from './VulpOSTester';
import type { Page } from '@playwright/test';

type Point = { x: number; y: number };

/** Sends the drop event a window drag ends with, carrying the app, pointer and grab offset. */
async function dropApp(page: Page, app: object, at: Point, offset: Point = { x: 0, y: 0 }) {
	await page.evaluate(({ app, at, offset }) => {
		const dataTransfer = new DataTransfer();
		dataTransfer.setData('application/json', JSON.stringify({ app, state: { x: 0.9, y: 0.9 }, offset }));
		document.body.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer,
			clientX: at.x,
			clientY: at.y,
		}));
	}, { app, at, offset });
}

async function centreOf(dialog: DialogHandle) {
	return dialog.evaluate((w: any) => {
		const rect = w.target.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	});
}

test('opens a dropped application centred on the cursor', async ({ vulpOS }) => {
	const at = { x: 640, y: 360 };
	const app = { id: 'drop.test.app', title: 'Dropped App', src: './example.html' };

	await dropApp(vulpOS.page, app, at);

	await vulpOS.page.waitForFunction(() => {
		const w = window.windowManager.windows['drop.test.app'];
		return Boolean(w && w.target);
	});

	// The state said bottom-right; the drop must ignore it and follow the pointer.
	const centre = await centreOf(await vulpOS.getWindow(app.id));
	expect(Math.abs(centre.x - at.x)).toBeLessThanOrEqual(6);
	expect(Math.abs(centre.y - at.y)).toBeLessThanOrEqual(6);
});

test('drops the window with the grab offset cancelled out', async ({ vulpOS }) => {
	const at = { x: 640, y: 360 };
	const offset = { x: 120, y: 80 };
	const app = { id: 'drop.offset.app', title: 'Offset App', src: './example.html' };

	await dropApp(vulpOS.page, app, at, offset);

	await vulpOS.page.waitForFunction(() => {
		const w = window.windowManager.windows['drop.offset.app'];
		return Boolean(w && w.target);
	});

	// The point of the window the pointer held must stay under the pointer, so the
	// window centre sits at (cursor - grab offset).
	const centre = await centreOf(await vulpOS.getWindow(app.id));
	expect(Math.abs(centre.x - (at.x - offset.x))).toBeLessThanOrEqual(6);
	expect(Math.abs(centre.y - (at.y - offset.y))).toBeLessThanOrEqual(6);
});

test('reuses the app window that is already open', async ({ vulpOS }) => {
	const at = { x: 500, y: 300 };
	const window = await vulpOS.openCube();

	await dropApp(vulpOS.page, { id: 'cube', title: 'Cube', src: './Applications/Cube/cube.html' }, at);

	const centre = await centreOf(window);
	expect(Math.abs(centre.x - at.x)).toBeLessThanOrEqual(6);
	expect(Math.abs(centre.y - at.y)).toBeLessThanOrEqual(6);
});
