import { test } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

test.use({ headless: true, channel: 'chrome' });

test('debug console warnings', async ({ page }) => {
	page.on('console', (msg) => console.log('[console:' + msg.type() + ']', msg.text()));
	page.on('pageerror', (error) => console.log('[pageerror]', error.message));
	await page.goto(pathToFileURL(resolve('Dist/indexIE8.html')).href);
	await page.waitForFunction(() => Boolean((window as any).windowManager), null, { timeout: 15000 });
	await page.waitForTimeout(2000);
});
