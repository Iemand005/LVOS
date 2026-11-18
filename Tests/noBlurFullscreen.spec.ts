import { test, expect } from './VulpOSTester';

test('noBlurFullscreen flag controls the maximized blur class', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	const blurDisabled = () => vulpOS.page.evaluate(() => document.body.classList.contains('no-blur'));

	expect(await vulpOS.page.evaluate(() => (window as any).flags.noBlurFullscreen)).toBe(true);
	expect(await blurDisabled()).toBe(false);

	await vulpOS.maximizeWindow(cube);
	await expect.poll(blurDisabled).toBe(true);

	await vulpOS.page.evaluate(() => { (window as any).flags.noBlurFullscreen = false; });
	await expect.poll(blurDisabled).toBe(false);

	await vulpOS.page.evaluate(() => { (window as any).flags.noBlurFullscreen = true; });
	await expect.poll(blurDisabled).toBe(true);

	await vulpOS.unmaximizeWindow(cube);
	await expect.poll(blurDisabled).toBe(false);
});
