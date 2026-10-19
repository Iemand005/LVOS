import { test, expect } from './VulpOSTester';

async function dropDataUrl(page: import('@playwright/test').Page, url: string, at: { x: number; y: number }) {
	await page.evaluate(({ url, at }) => {
		const dt = new DataTransfer();
		dt.setData('text/uri-list', url);
		dt.setData('text/plain', url);
		document.body.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: dt,
			clientX: at.x,
			clientY: at.y,
		}));
	}, { url, at });
}

test('drops a URL onto desktop and opens it', async ({ vulpOS }) => {
	const at = { x: 600, y: 400 };
	const url = 'https://example.org/';
	await dropDataUrl(vulpOS.page, url, at);

	await vulpOS.page.waitForFunction((url) => {
		if (!window.appManager) return false;
		for (const id in window.appManager.apps) {
			const a = window.appManager.apps[id];
			if (a && (a.src === url || a.distSrc === url)) {
				const w = window.windowManager.windows[id];
				return Boolean(w && w.target);
			}
		}
		return false;
	}, url);

	const windows = await vulpOS.page.evaluate((url) => {
		for (const id in window.appManager.apps) {
			const a = window.appManager.apps[id];
			if (a && (a.src === url || a.distSrc === url)) {
				const w = window.windowManager.windows[id];
				const r = w && w.target ? w.target.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
				return { id, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
			}
		}
		return null;
	}, url);

	expect(windows).not.toBeNull();
	if (windows) {
		expect(Math.abs(windows.cx - at.x)).toBeLessThanOrEqual(10);
		expect(Math.abs(windows.cy - at.y)).toBeLessThanOrEqual(10);
	}
});
