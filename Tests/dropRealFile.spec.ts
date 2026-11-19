import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

async function dropFiles(page: import('@playwright/test').Page, files: { name: string; type: string; content: string }[], at: { x: number; y: number }) {
	await page.evaluate(({ files, at }) => {
		const dt = new DataTransfer();
		files.forEach(file => dt.items.add(new File([file.content], file.name, { type: file.type })));
		dt.setData('text/plain', files[0].name);
		dt.setData('text/uri-list', 'file:///C:/Users/Test/' + files[0].name);

		const target = document.getElementById('desktop-folder') || document.body;
		target.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: dt,
			clientX: at.x,
			clientY: at.y,
		}));
	}, { files, at });
}

test('dropping real files creates icons that keep the received File objects', async ({ vulpOS }) => {
	const page = vulpOS.page;
	await dropFiles(page, [
		{ name: 'notes.txt', type: 'text/plain', content: 'hello notes' },
		{ name: 'todo.txt', type: 'text/plain', content: 'hello todo' },
	], { x: 500, y: 300 });

	const icons = page.locator('#desktop-folder > .file-item.placed');
	await expect(icons).toHaveCount(2);

	const notes = icons.filter({ hasText: 'notes.txt' });
	await expect(notes).toHaveCount(1);

	const bound = await notes.evaluate(async (element: any) => {
		const file = element.lvFile;
		return {
			name: file && file.name,
			type: file && file.type,
			text: file ? await file.text() : null,
			viaHelper: window.Helpers.getDesktopFile(element) === file,
		};
	});
	expect(bound).toEqual({ name: 'notes.txt', type: 'text/plain', text: 'hello notes', viaHelper: true });

	const box = await notes.boundingBox();
	expect(box).not.toBeNull();
	expect(Math.abs(box!.x + box!.width / 2 - 500)).toBeLessThanOrEqual(12);
	expect(Math.abs(box!.y + box!.height / 2 - 300)).toBeLessThanOrEqual(12);
});

test('a real file drop does not open the filename as a URL app', async ({ vulpOS }) => {
	await dropFiles(vulpOS.page, [
		{ name: 'notes.txt', type: 'text/plain', content: 'hello notes' },
	], { x: 400, y: 200 });

	const bogusApp = await vulpOS.page.evaluate(() => {
		for (const id in window.appManager.apps) {
			const app = window.appManager.apps[id];
			if (app && (app.src || '').indexOf('notes.txt') !== -1) return true;
		}
		return false;
	});
	expect(bogusApp).toBe(false);
});

test('double clicking a dropped file logs the bound File object', async ({ vulpOS }) => {
	await dropFiles(vulpOS.page, [
		{ name: 'notes.txt', type: 'text/plain', content: 'hello notes' },
	], { x: 500, y: 300 });

	await vulpOS.page.evaluate(() => {
		(window as any).__logged = [];
		(window as any).__opened = [];
		console.log = (...args: any[]) => (window as any).__logged.push(args);
		(window as any).os.open = (file: File) => (window as any).__opened.push(file);
	});

	const icon = vulpOS.page.locator('#desktop-folder > .file-item.placed').filter({ hasText: 'notes.txt' });
	await icon.dblclick();

	const result = await vulpOS.page.evaluate(() => {
		const args = (window as any).__logged;
		const file = args[0] && args[0][0];
		const opened = (window as any).__opened;
		return {
			loggedCount: args.length,
			isFile: file instanceof File,
			name: file && file.name,
			type: file && file.type,
			openedCount: opened.length,
			openedIsSame: opened[0] === file,
		};
	});
	expect(result).toEqual({ loggedCount: 1, isFile: true, name: 'notes.txt', type: 'text/plain', openedCount: 1, openedIsSame: true });
});

test('dropping an image URL creates an image file instead of installing an app', async ({ vulpOS }) => {
	const url = 'https://cdn.discordapp.com/avatars/1130212071158583457/5a2cb41bbeabf5b7e43bdbffaf86c4fc.webp?size=100';

	await vulpOS.page.evaluate((imageUrl) => {
		const transfer = new DataTransfer();
		transfer.setData('text/html', '<html><body><!--StartFragment--><img src="' + imageUrl + '" alt=" "><!--EndFragment--></body></html>');
		transfer.setData('text/x-moz-url', imageUrl + '\n ');
		transfer.setData('text/plain', imageUrl);

		const target = document.getElementById('desktop-folder') || document.body;
		target.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: transfer,
			clientX: 460,
			clientY: 260,
		}));
	}, url);

	const icon = vulpOS.page.locator('#desktop-folder > .file-item.placed').filter({ hasText: '5a2cb41bbeabf5b7e43bdbffaf86c4fc.webp' });
	await expect(icon).toHaveCount(1);

	const result = await vulpOS.page.evaluate(() => {
		const element = document.querySelector('#desktop-folder > .file-item.placed') as any;
		const installed = Object.keys(window.appManager.apps).filter((id) => {
			const app = window.appManager.apps[id];
			return app && String(app.src).indexOf('discordapp.com') !== -1;
		});
		return { bound: element && element.lvFile, installed };
	});
	expect(result.bound).toBe(url);
	expect(result.installed).toEqual([]);

	await icon.dblclick();

	await vulpOS.page.waitForFunction((expected) => {
		const photos = window.windowManager.windows.photos;
		const frame = photos && photos.frame;
		const image = frame && frame.contentDocument && frame.contentDocument.getElementById('photo');
		return Boolean(photos && photos.isOpen && image && (image as HTMLImageElement).src === expected);
	}, url);

	const rendered = await vulpOS.page.evaluate(() => {
		const frame = window.windowManager.windows.photos.frame!;
		const image = frame.contentDocument!.getElementById('photo') as HTMLImageElement;
		return { src: image.src, alt: image.alt };
	});
	expect(rendered.src).toBe(url);
	expect(rendered.alt).toBe('Opened image');
});

test('dropping a normal URL still installs it as an app', async ({ vulpOS }) => {
	await vulpOS.page.evaluate(() => {
		const transfer = new DataTransfer();
		transfer.setData('text/uri-list', 'https://example.com/');
		transfer.setData('text/plain', 'https://example.com/');

		const target = document.getElementById('desktop-folder') || document.body;
		target.dispatchEvent(new DragEvent('drop', {
			bubbles: true,
			cancelable: true,
			dataTransfer: transfer,
			clientX: 520,
			clientY: 240,
		}));
	});

	const installed = await vulpOS.page.evaluate(() => {
		const app = Object.keys(window.appManager.apps)
			.map(id => window.appManager.apps[id])
			.find(candidate => candidate && candidate.src === 'https://example.com/');
		return Boolean(app && window.windowManager.windows[app.id]);
	});
	expect(installed).toBe(true);
});

test('file click callbacks receive the bound File object', async ({ vulpOS }) => {
	await vulpOS.page.evaluate(() => {
		const file = new File(['callback'], 'callback.txt', { type: 'text/plain' });
		(window as any).__calls = [];
		Helpers.addDesktopFile(file, 300, 200,
			(bound: File) => (window as any).__calls.push(['click', bound.name]),
			(bound: File) => (window as any).__calls.push(['dblclick', bound.name]));
	});

	const icon = vulpOS.page.locator('#desktop-folder > .file-item.placed').filter({ hasText: 'callback.txt' });
	await icon.dblclick();

	const calls = await vulpOS.page.evaluate(() => (window as any).__calls);
	expect(calls.some((call: string[]) => call[0] === 'click')).toBe(true);
	expect(calls.filter((call: string[]) => call[0] === 'dblclick')).toEqual([['dblclick', 'callback.txt']]);
});
