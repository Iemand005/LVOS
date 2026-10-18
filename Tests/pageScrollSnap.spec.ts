import { test, expect, Page } from '@playwright/test';

test.use({ headless: true, channel: 'chrome' });

// Mirrors Styles/desktop.css: the page is the root (html) scroller and is 200vh
// tall, with a snap point at the very top and one at the very bottom.
const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
html { margin: 0; scroll-behavior: smooth; scroll-snap-type: y mandatory; scrollbar-width: none; height: 100%; }
body { display: flex; flex-direction: column; margin: 0; height: 100%; min-height: 200vh; touch-action: auto; overscroll-behavior: none; }
main { position: fixed; }
body::before { content: ""; display: block; flex: 0 0 1px; scroll-snap-align: start; }
body::after { content: ""; display: block; flex: 0 0 1px; margin-top: auto; scroll-snap-align: end; }
</style></head>
<body><main>hello</main></body></html>`;

async function wheelAndSettle(page: Page, delta: number) {
	await page.mouse.move(500, 400);
	await page.mouse.wheel(0, delta);
	await page.waitForTimeout(1200);
	return page.evaluate(() => document.documentElement.scrollTop);
}

async function topAndMax(page: Page) {
	return page.evaluate(() => ({
		top: document.documentElement.scrollTop,
		max: document.documentElement.scrollHeight - innerHeight,
	}));
}

test('the page snaps to the top or bottom after the wheel is released', async ({ page }) => {
	await page.setContent(HTML);
	await page.waitForTimeout(150);

	const { max } = await topAndMax(page);
	expect(max).toBeGreaterThan(0);

	// A small nudge from the top stays at the top.
	expect(await wheelAndSettle(page, 80)).toBe(0);

	// Well past halfway commits to the bottom.
	expect(await wheelAndSettle(page, max)).toBe(max);

	// A small nudge from the bottom stays at the bottom.
	expect(await wheelAndSettle(page, -80)).toBe(max);

	// Back past halfway commits to the top again.
	expect(await wheelAndSettle(page, -max)).toBe(0);
});

test('never rests between the two snap points', async ({ page }) => {
	await page.setContent(HTML);
	await page.waitForTimeout(150);
	const { max } = await topAndMax(page);

	for (const delta of [max / 4, max / 4, max / 4, max / 4]) {
		const top = await wheelAndSettle(page, delta);
		expect([0, max]).toContain(top);
	}
});
