import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('VulpOS.open routes files by extension to a registered app', async ({ vulpOS }) => {
	const appId = 'file-handler';

	await vulpOS.page.evaluate((id) => {
		const app = {
			id: id,
			title: 'File Handler',
			src: './Tests/fixtures/file-handler.html',
			fileTypes: ['txt', 'js']
		};
		window.appManager.addApp(app);
		window.windowManager.loadApp(app);
	}, appId);

	const association = await vulpOS.page.evaluate(() => ({
		dict: window.appManager.fileTypes,
		app: window.appManager.getAppForFileType('TXT')
	}));
	expect(association.dict.txt).toBe(appId);
	expect(association.dict.js).toBe(appId);
	expect(association.app).toBe(appId);

	await vulpOS.page.evaluate(() => {
		(window as any).os.open(new File(['hello from disk'], 'notes.txt', { type: 'text/plain' }));
	});

	const dialog = await vulpOS.getWindow(appId);
	await vulpOS.assertWindowOpen(dialog);

	await vulpOS.page.waitForFunction((id) => {
		const target = window.windowManager.windows[id];
		const received = target && target.frame && target.frame.contentWindow && (target.frame.contentWindow as any).__receivedFiles;
		return received && received.length === 1;
	}, appId);

	const first = await vulpOS.page.evaluate((id) => {
		const frame = window.windowManager.windows[id].frame!;
		return (frame.contentWindow as any).__receivedFiles[0];
	}, appId);
	expect(first.isFile).toBe(true);
	expect(first.name).toBe('notes.txt');
	expect(first.size).toBe(15);

	await vulpOS.page.waitForFunction((id) => {
		const frame = window.windowManager.windows[id].frame!;
		return Boolean((frame.contentWindow as any).__receivedFiles[0].text);
	}, appId);
	const text = await vulpOS.page.evaluate((id) => {
		const frame = window.windowManager.windows[id].frame!;
		return (frame.contentWindow as any).__receivedFiles[0].text;
	}, appId);
	expect(text).toBe('hello from disk');

	await vulpOS.page.evaluate(() => {
		(window as any).os.open('folder/main.TXT?raw=true');
	});

	await vulpOS.page.waitForFunction((id) => {
		const frame = window.windowManager.windows[id].frame!;
		return (frame.contentWindow as any).__receivedFiles.length === 2;
	}, appId);

	const second = await vulpOS.page.evaluate((id) => {
		const frame = window.windowManager.windows[id].frame!;
		return (frame.contentWindow as any).__receivedFiles[1];
	}, appId);
	expect(second.isFile).toBe(false);
	expect(second.path).toBe('folder/main.TXT?raw=true');
});

test('Helpers.getFileExtension extracts extensions from paths and files', async ({ vulpOS }) => {
	const extensions = await vulpOS.page.evaluate(() => [
		window.Helpers.getFileExtension('notes.txt'),
		window.Helpers.getFileExtension('http://localhost:3621/folder/main.JS?x=1#y'),
		window.Helpers.getFileExtension('C:\\files\\archive.ZIP'),
		window.Helpers.getFileExtension(new URL('https://example.com/a/b.json?x=1')),
		window.Helpers.getFileExtension(new File([''], 'readme')),
		window.Helpers.getFileExtension('no-extension')
	]);
	expect(extensions).toEqual(['txt', 'js', 'zip', 'json', '', '']);
});
