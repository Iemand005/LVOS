import { test, expect, DialogHandle } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

async function frameFor(dialog: DialogHandle) {
	const handle = await dialog.evaluateHandle(dialog => dialog.frame);
	const frame = await handle.asElement()!.contentFrame();
	expect(frame).not.toBeNull();
	return frame!;
}

test('explorer shows the navigation shell, file view and status count', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const frame = vulpOS.page.frameLocator('iframe[src*="explorer.html"]');
	await expect(frame.locator('script[src*="Messenger.js"]')).toHaveCount(1);
	await expect(frame.locator('header nav button')).toHaveCount(4);
	await expect(frame.locator('#address')).toBeVisible();
	await expect(frame.locator('#search')).toBeVisible();
	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);
	await expect(frame.locator('#file-count')).toHaveText('4 files');
	await expect(frame.locator('#file-view ul')).toHaveCSS('list-style-type', 'none');

	const heights = await frame.locator('header, header nav, #address, #search, footer').evaluateAll(
		elements => elements.map(element => Math.round(element.getBoundingClientRect().height)));
	expect(heights).toEqual([35, 35, 22, 22, 23]);
});

test('explorer uses only the icon as the drag image', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	const frame = await frameFor(dialog);

	await frame.evaluate(() => {
		(window as any).__dragImages = [];
		const original = DataTransfer.prototype.setDragImage;
		DataTransfer.prototype.setDragImage = function (element, x, y) {
			(window as any).__dragImages.push({ tag: element.tagName, src: (element as HTMLImageElement).src, x, y });
			return original.call(this, element, x, y);
		};
	});
	await frame.evaluate(() => {
		const item = document.querySelector<HTMLElement>('#file-view .file-item')!;
		item.dispatchEvent(new DragEvent('dragstart', {
			bubbles: true,
			cancelable: true,
			dataTransfer: new DataTransfer()
		}));
	});

	const images = await frame.evaluate(() => (window as any).__dragImages);
	expect(images).toHaveLength(1);
	expect(images[0].tag).toBe('IMG');
	expect(images[0].src).toContain('icon-192.png');
});

test('explorer folder views get the wallpaper selector', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	const frame = await frameFor(dialog);
	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);

	await frame.evaluate(() => {
		const view = document.getElementById('file-view')!;
		const rect = view.getBoundingClientRect();
		view.dispatchEvent(new PointerEvent('pointerdown', {
			bubbles: true,
			clientX: rect.left + 2,
			clientY: rect.top + 2,
			button: 0
		}));
	});
	await expect(frame.locator('#file-view .selector')).toHaveCount(1);

	await frame.evaluate(() => {
		const view = document.getElementById('file-view')!;
		const rect = view.getBoundingClientRect();
		const point = { clientX: rect.right - 2, clientY: rect.bottom - 2, button: 0 };
		view.ownerDocument.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, ...point }));
		view.ownerDocument.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, ...point }));
	});

	await expect(frame.locator('#file-view .file-item.selected')).toHaveCount(4);
	await expect(frame.locator('#file-view .selector')).toHaveCount(0);
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

test('explorer moves existing file icons on internal drops', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const frame = vulpOS.page.frameLocator('iframe[src*="explorer.html"]');
	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);

	const before = await frame.locator('#file-view .file-item').first().evaluate((element: HTMLElement) => ({
		id: element.id,
		left: element.style.left,
		top: element.style.top
	}));

	await frame.locator('#file-view').evaluate((element) => {
		const source = element.querySelector('.file-item') as HTMLElement;
		const transfer = new DataTransfer();
		transfer.setData('application/x-lvos-file', JSON.stringify({
			id: source.id,
			name: source.querySelector('label')!.textContent,
			icon: source.querySelector('img')!.src
		}));
		element.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: transfer,
			clientX: 300,
			clientY: 200
		}));
	});

	await expect(frame.locator('#file-view .file-item')).toHaveCount(4);
	await expect(frame.locator('#file-count')).toHaveText('4 files');

	const after = await frame.locator('#' + before.id).evaluate((element: HTMLElement) => ({
		left: element.style.left,
		top: element.style.top,
		parent: element.parentElement && element.parentElement.id
	}));
	expect(after.parent).toBe('file-view');
	expect(after.left).not.toBe(before.left);
	expect(after.top).not.toBe(before.top);
});

test('mounting a picked directory opens a new Files window with its contents', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('files', 'Files', './Applications/Files/explorer.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const frame = await frameFor(dialog);
	const appButtonsBefore = await vulpOS.page.locator('#applist button').allTextContents();
	await frame.evaluate(() => {
		(window as any).showDirectoryPicker = async () => ({
			name: 'Documents',
			kind: 'directory',
			values: async function* () {
				yield { name: 'notes.txt', kind: 'file' };
				yield {
					name: 'Pictures',
					kind: 'directory',
					values: async function* () {
						yield {
							name: 'cat.png',
							kind: 'file',
							getFile: async () => new File(['png'], 'cat.png', { type: 'image/png' })
						};
					}
				};
			}
		});
	});

	await frame.locator('#mount').click();
	await vulpOS.page.waitForFunction(() => Boolean((window as any).windowManager.windows['files#2']));
	const mounted = await vulpOS.getWindow('files#2');
	await vulpOS.assertWindowOpen(mounted);
	expect(await vulpOS.page.locator('#applist button').allTextContents()).toEqual(appButtonsBefore);

	const mountedFrame = await frameFor(mounted);
	await expect(mountedFrame.locator('#address')).toHaveValue('Documents');
	await expect(mountedFrame.locator('#file-view .file-item')).toHaveCount(2);
	await expect(mountedFrame.locator('#file-count')).toHaveText('2 files');
	await expect(mountedFrame.locator('#file-view .file-item').first()).toContainText('Pictures');

	await mountedFrame.locator('#file-view .file-item').filter({ hasText: 'Pictures' }).dblclick();
	await expect(mountedFrame.locator('#address')).toHaveValue('Pictures');
	await expect(mountedFrame.locator('#file-view .file-item')).toHaveCount(1);
	await expect(mountedFrame.locator('#file-count')).toHaveText('1 file');

	await mountedFrame.locator('#file-view .file-item').filter({ hasText: 'cat.png' }).dblclick();
	await vulpOS.page.waitForFunction(() => {
		const photos = (window as any).windowManager.windows['photos'];
		return Boolean(photos && photos.isOpen);
	});
});
