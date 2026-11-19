import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('explorer shows the navigation shell, file view and status count', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const frame = vulpOS.page.frameLocator('iframe[src*="explorer.html"]');
	await expect(frame.locator('script[src*="Messenger.js"]')).toHaveCount(1);
	await expect(frame.locator('header nav button')).toHaveCount(3);
	await expect(frame.locator('#address')).toBeVisible();
	await expect(frame.locator('#search')).toBeVisible();
	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);
	await expect(frame.locator('#file-count')).toHaveText('4 files');

	const heights = await frame.locator('header, header nav, #address, #search, footer').evaluateAll(
		elements => elements.map(element => Math.round(element.getBoundingClientRect().height)));
	expect(heights).toEqual([35, 35, 22, 22, 23]);
});

test('explorer accepts real file drops into the folder', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const frame = vulpOS.page.frameLocator('iframe[src*="explorer.html"]');
	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);

	await frame.locator('#file-view').evaluate((element) => {
		const transfer = new DataTransfer();
		transfer.items.add(new File(['dropped notes'], 'dropped.txt', { type: 'text/plain' }));
		transfer.items.add(new File(['console.log(1)'], 'notes.js', { type: 'text/javascript' }));
		element.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: transfer,
			clientX: 120,
			clientY: 90
		}));
	});

	await expect(frame.locator('#file-view .file-item')).toHaveCount(6);
	await expect(frame.locator('#file-count')).toHaveText('6 files');

	const dropped = frame.locator('#file-view .file-item').filter({ hasText: 'dropped.txt' });
	const bound = await dropped.evaluate(async (element: any) => ({
		name: element.lvFile && element.lvFile.name,
		text: element.lvFile ? await element.lvFile.text() : null,
		placed: element.classList.contains('placed')
	}));
	expect(bound).toEqual({ name: 'dropped.txt', text: 'dropped notes', placed: true });
});
