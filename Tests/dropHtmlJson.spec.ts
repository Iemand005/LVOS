import { test, expect } from './VulpOSTester';

async function dropHtmlJson(page: import('@playwright/test').Page, payload: object, at: { x: number; y: number }) {
	await page.evaluate(({ payload, at }) => {
		const dt = new DataTransfer();
		const html = '<div style="display:none">' + JSON.stringify(payload) + '</div>';
		dt.setData('text/html', html);
		dt.setData('text/plain', 'not-json');
		document.body.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: dt,
			clientX: at.x,
			clientY: at.y,
		}));
	}, { payload, at });
}

test('restores window size when JSON is hidden in text/html', async ({ vulpOS }) => {
	const at = { x: 550, y: 350 };
	const payload: DialogDropState = {
		app: { id: 'drop.size.app', title: 'Size App', src: './example.html' },
		state: { x: 0.5, y: 0.5, width: 900, height: 600, open: true, title: ", ", z: 0, maximized: false },
		offset: { x: 50, y: 40 },
	};
	await dropHtmlJson(vulpOS.page, payload, at);

	await vulpOS.page.waitForFunction(() => {
		const w = window.windowManager.windows['drop.size.app'];
		return Boolean(w && w.target);
	});

	const rect = await vulpOS.page.evaluate(() => {
		const w = window.windowManager.windows['drop.size.app'];
		if (!w || !w.target) return { width: 0, height: 0 };
		const r = w.target.getBoundingClientRect();
		return { width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
	});

	expect(Math.abs(rect.width - 900)).toBeLessThanOrEqual(2);
	expect(Math.abs(rect.height - 600)).toBeLessThanOrEqual(2);
	expect(Math.abs(rect.cx - (at.x - payload.offset.x))).toBeLessThanOrEqual(6);
	expect(Math.abs(rect.cy - (at.y - payload.offset.y))).toBeLessThanOrEqual(6);
});
