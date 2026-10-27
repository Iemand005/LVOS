import { test } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

test.use({ headless: true, channel: 'chrome' });

test('debug console warnings', async ({ page }) => {
	page.on('console', (msg) => console.log('[console:' + msg.type() + ']', msg.text()));
	page.on('pageerror', (error) => console.log('[pageerror]', error.message));
	await page.goto(pathToFileURL(resolve('Dist/indexIE8.html')).href);
	await page.waitForFunction(() => Boolean((window as any).windowManager), null, { timeout: 15000 });
	await page.waitForTimeout(1000);
	const info = await page.evaluate(() => {
		const w = window as any;
		const windows = w.__lvosGet(w.windowManager, 'windows');
		return {
			windowKeys: windows ? Object.keys(windows) : null,
			bad: windows ? Object.keys(windows).map((key) => {
				const value = windows[key];
				return { key, type: typeof value, ctor: value && value.constructor && value.constructor.name, hasGetState: Boolean(value && typeof value.getState === 'function'), tag: value && value.tagName };
			}).filter((entry) => !entry.hasGetState) : null
		};
	});
	console.log('windows', JSON.stringify(info, null, 2));
});
