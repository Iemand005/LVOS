import { test, expect, DialogHandle } from './VulpOSTester';
import type { Page } from '@playwright/test';

type Point = { x: number; y: number };

/** Sends the drop event a window drag ends with, carrying the app and the pointer. */
async function dropApp(page: Page, app: object, at: Point) {
	await page.evaluate(({ app, at }) => {
		const dataTransfer = new DataTransfer();
		dataTransfer.setData('application/json', JSON.stringify({ app, state: { x: 0.9, y: 0.9 } }));
		document.body.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer,
			clientX: at.x,
			clientY: at.y,
		}));
	}, { app, at });
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

test('reuses the app window that is already open', async ({ vulpOS }) => {
	const at = { x: 500, y: 300 };
	const window = await vulpOS.openCube();

	await dropApp(vulpOS.page, { id: 'cube', title: 'Cube', src: './Applications/Cube/cube.html' }, at);

	const centre = await centreOf(window);
	expect(Math.abs(centre.x - at.x)).toBeLessThanOrEqual(6);
	expect(Math.abs(centre.y - at.y)).toBeLessThanOrEqual(6);
});
