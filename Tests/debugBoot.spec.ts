import { test } from '@playwright/test';

test.use({ headless: true, channel: 'chrome' });

test('debug boot', async ({ page }) => {
	page.on('console', message => console.log('console:', message.type(), message.text()));
	page.on('pageerror', error => console.log('pageerror:', error.message));
	await page.goto('http://localhost:3621/');
	await page.waitForTimeout(4000);
	console.log('overlay', await page.evaluate(() => {
		const overlay = document.getElementById('overlay');
		return { cls: overlay && overlay.className, endAnim: Boolean((window as any).desktopManager && (window as any).desktopManager._endAnim) };
	}));
});
