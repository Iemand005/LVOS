import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('explorer shows the navigation shell, file view and status count', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const frame = vulpOS.page.frameLocator('iframe[src*="explorer.html"]');
	await expect(frame.locator('header nav button')).toHaveCount(3);
	await expect(frame.locator('#address')).toBeVisible();
	await expect(frame.locator('#search')).toBeVisible();
	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);
	await expect(frame.locator('#file-count')).toHaveText('4 files');

	const heights = await frame.locator('header, header nav, #address, #search, footer').evaluateAll(
		elements => elements.map(element => Math.round(element.getBoundingClientRect().height)));
	expect(heights).toEqual([35, 35, 22, 22, 23]);
});
