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

test('a reaped window can be launched again', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.closeWindow(cube);
	await expect.poll(() => cube.evaluate((dialog: any) => Boolean(dialog.target?.parentElement)), { timeout: 4000 }).toBe(false);

	await vulpOS.launchWindow(cube);
	await expect.poll(() => cube.evaluate((dialog: any) => ({
		inDom: Boolean(dialog.target?.parentElement),
		open: dialog.isOpen,
		killing: dialog._killing === true,
	})), { timeout: 4000 }).toEqual({ inDom: true, open: true, killing: false });
});

test('a reaped window opens from its launch button on the first click', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.closeWindow(cube);
	await expect.poll(() => cube.evaluate((dialog: any) => Boolean(dialog.target?.parentElement)), { timeout: 4000 }).toBe(false);

	await cube.evaluate((dialog: any) => dialog.createOpenButton().click());

	await expect.poll(() => cube.evaluate((dialog: any) => ({
		inDom: Boolean(dialog.target?.parentElement),
		open: dialog.isOpen,
		killing: dialog._killing === true,
	})), { timeout: 4000 }).toEqual({ inDom: true, open: true, killing: false });
});

test('diag applist relaunch', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.closeWindow(cube);
	await expect.poll(() => cube.evaluate((dialog: any) => Boolean(dialog.target?.parentElement)), { timeout: 4000 }).toBe(false);

	const buttons = await vulpOS.page.locator('#applist button').allTextContents();
	console.log('applist buttons', JSON.stringify(buttons));

	await vulpOS.page.locator('#applist button', { hasText: 'Cube' }).click();

	await vulpOS.page.waitForTimeout(1000);
	console.log('after applist click', JSON.stringify(await cube.evaluate((dialog: any) => ({
		inDom: Boolean(dialog.target?.parentElement),
		open: dialog.isOpen,
		stateOpen: dialog._stateOpen,
		killing: dialog._killing === true,
	}))));
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
