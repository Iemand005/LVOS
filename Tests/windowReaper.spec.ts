import { test, expect } from './VulpOSTester';

test('window reaper removes closed windows from the DOM', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	const reaper = await vulpOS.page.evaluate(() => window.windowManager.getExtension('window-reaper'));

	expect(reaper).not.toBeNull();
	expect(reaper?.enabled).toBe(true);

	await vulpOS.closeWindow(window);
	await expect.poll(() => window.evaluate(dialog => ({
		killing: dialog._killing === true,
		inDom: Boolean(dialog.target?.parentElement),
	})), { timeout: 4000 }).toEqual({ killing: true, inDom: false });

	expect(await vulpOS.page.evaluate(() =>
		window.windowManager.windows['cube'] !== undefined
	)).toBe(true);
});

test('extension enabled states persist across reloads', async ({ vulpOS }) => {
	const setReaper = (enabled: boolean) => vulpOS.page.evaluate((enabled) => {
		window.windowManager.toggleExtensionEnabled(window.windowManager.getExtension('window-reaper'), enabled);
	}, enabled);
	const reaperEnabled = () => vulpOS.page.evaluate(() =>
		Boolean(window.windowManager.getExtension('window-reaper')?.enabled)
	);

	await setReaper(false);
	expect(await vulpOS.page.evaluate(() => localStorage.getItem('extensionState'))).toContain('"window-reaper":false');

	await vulpOS.page.reload();
	await vulpOS.page.waitForFunction(() => Boolean(window.windowManager?.getExtension('window-reaper')));
	expect(await reaperEnabled()).toBe(false);

	await setReaper(true);
	await vulpOS.page.reload();
	await vulpOS.page.waitForFunction(() => Boolean(window.windowManager?.getExtension('window-reaper')));
	expect(await reaperEnabled()).toBe(true);
});
