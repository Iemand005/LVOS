import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

/**
 * indexIE8.html lays windows out with a two-row table (header + body). The body
 * cell used to be 100% of the table height, so it was header-height taller than
 * the window. The table must fill the window and the body row take the rest.
 */
test.use({ headless: true, channel: 'chrome' });

test('indexIE8 table windows keep the body inside the window', async ({ page }) => {
	await page.goto(pathToFileURL(resolve('indexIE8.html')).href);

	await page.waitForFunction(() =>
		typeof window.windowManager !== 'undefined' && window.windowManager.loaded !== false
	);

	const result = await page.evaluate(() => {
		const windowElement = document.getElementById('console');
		if (!windowElement) return { error: 'no console window' };

		// Make sure the window is actually laid out.
		windowElement.classList.add('open');

		const table = windowElement.querySelector('table.content');
		const header = windowElement.querySelector('td.header');
		const article = windowElement.querySelector('td.article');
		if (!table || !header || !article) return { error: 'no table layout' };

		const win = windowElement.getBoundingClientRect();
		const head = header.getBoundingClientRect();
		const body = article.getBoundingClientRect();

		return {
			display: getComputedStyle(table).display,
			winBottom: win.bottom,
			headBottom: head.bottom,
			bodyTop: body.top,
			bodyBottom: body.bottom,
			bodyHeight: body.height,
		};
	});

	expect(result.error).toBeUndefined();
	expect(result.display, 'table.content must stay a table, not a flex box').toBe('table');
	expect(result.bodyHeight, 'the body row has no height').toBeGreaterThan(0);
	expect(result.bodyTop, 'the body overlaps the header').toBeGreaterThanOrEqual(result.headBottom - 1);
	expect(result.bodyBottom, 'the body pokes past the bottom of the window').toBeLessThanOrEqual(result.winBottom + 1);
});
