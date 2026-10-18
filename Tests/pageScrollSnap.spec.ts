import { test, expect, Page } from '@playwright/test';

test.use({ headless: true, channel: 'chrome' });

const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
html, body { margin: 0; }
.panel { height: 100vh; scroll-snap-align: start; }
.panel:nth-child(1) { background: red; }
.panel:nth-child(2) { background: green; }
.element-scroller { height: 100vh; overflow-y: scroll; scroll-snap-type: y mandatory; scrollbar-width: none; }
</style></head>
<body>
<div id="element" class="element-scroller"><div class="panel"></div><div class="panel"></div></div>
<div id="root"><div class="panel"></div><div class="panel"></div></div>
</body></html>`;

test('element scroller snaps with mandatory y', async ({ page }) => {
	await page.setContent(HTML);
	const el = page.locator('#element');
	await page.evaluate(() => { document.getElementById('root')!.style.display = 'none'; });
	await el.evaluate((e) => { e.scrollTop = 250; });
	await page.mouse.move(200, 400);
	await page.mouse.wheel(0, 5);
	await page.waitForTimeout(1000);
	const top = await el.evaluate((e) => e.scrollTop);
	console.log('ELEMENT scrollTop after wheel:', top);
	expect([0, await el.evaluate((e) => e.scrollHeight - e.clientHeight)]).toContain(top);
});

test('root html scroller snaps with mandatory y', async ({ page }) => {
	await page.setContent(HTML);
	await page.evaluate(() => {
		document.getElementById('element')!.style.display = 'none';
		document.documentElement.style.scrollSnapType = 'y mandatory';
	});
	await page.mouse.move(200, 400);
	await page.mouse.wheel(0, 400);
	await page.waitForTimeout(900);
	const top = await page.evaluate(() => document.documentElement.scrollTop);
	const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
	console.log('ROOT scrollTop after wheel:', top, 'max:', max);
	expect([0, max]).toContain(top);
});
