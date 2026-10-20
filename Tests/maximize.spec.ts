import { test, expect } from './VulpOSTester';

/**
 * The compositor ("scaled-max") maximize path animates with a class toggle whose
 * end callback has to land: it applies the `maximized` class, lifts the scale and
 * clears the animation bookkeeping. It used to wait for `webkitTransitionEnd`,
 * which modern Chrome never dispatches, so with animations on the window froze
 * mid-animation — full-screen, unmaximized, unrestorable.
 */
test('maximize lands with transform movement (compositor path)', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.setAnimations(true);
	await cube.evaluate((dialog: any) => {
		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;
	});

	const before = await vulpOS.state(cube);
	const beforeRect = await vulpOS.measure(cube);

	await cube.evaluate((dialog: any) => dialog.maximize());
	await expect.poll(() => vulpOS.state(cube).then(s => s.maximized), { timeout: 4000 }).toBe(true);

	const maximized = await cube.evaluate((dialog: any) => ({
		maximizedClass: dialog.target!.classList.contains('maximized'),
		scaledMaxClass: dialog.target!.classList.contains('scaled-max'),
		animatingClass: dialog.target!.classList.contains('animating'),
		pointerEvents: dialog.target!.style.pointerEvents,
		animations: dialog.maximizeAnimations,
	}));
	expect(maximized.maximizedClass).toBe(true);
	expect(maximized.scaledMaxClass).toBe(false);
	expect(maximized.animatingClass).toBe(false);
	expect(maximized.pointerEvents).toBe('');
	expect(maximized.animations).toBe(0);

	const maxRect = await vulpOS.measure(cube);
	expect(Math.abs(maxRect.x - maxRect.sectionX)).toBeLessThan(2);
	expect(Math.abs(maxRect.y - maxRect.sectionY)).toBeLessThan(2);
	expect(Math.abs(maxRect.width - maxRect.sectionWidth)).toBeLessThan(2);
	expect(Math.abs(maxRect.height - maxRect.sectionHeight)).toBeLessThan(2);

	await cube.evaluate((dialog: any) => dialog.toggleMaximized(false));
	await expect.poll(() => vulpOS.state(cube).then(s => s.maximized), { timeout: 4000 }).toBe(false);

	const restoredRect = await vulpOS.measure(cube);
	expect(Math.abs(restoredRect.width - beforeRect.width)).toBeLessThan(2);
	expect(Math.abs(restoredRect.x - before.x)).toBeLessThan(2);
	expect(Math.abs(restoredRect.y - before.y)).toBeLessThan(2);
});

/** The default path on browsers with the View Transition API. */
test('maximize lands via view transitions (default path)', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.setAnimations(true);
	await cube.evaluate((dialog: any) => {
		(globalThis as any).flags.useTransform = true;
	});

	const before = await vulpOS.state(cube);
	const beforeRect = await vulpOS.measure(cube);

	await cube.evaluate((dialog: any) => dialog.maximize());
	await expect.poll(() => vulpOS.state(cube).then(s => s.maximized), { timeout: 4000 }).toBe(true);

	const maxRect = await vulpOS.measure(cube);
	expect(Math.abs(maxRect.x - maxRect.sectionX)).toBeLessThan(2);
	expect(Math.abs(maxRect.y - maxRect.sectionY)).toBeLessThan(2);
	expect(Math.abs(maxRect.width - maxRect.sectionWidth)).toBeLessThan(2);
	expect(Math.abs(maxRect.height - maxRect.sectionHeight)).toBeLessThan(2);

	await cube.evaluate((dialog: any) => dialog.toggleMaximized(false));
	await expect.poll(() => vulpOS.state(cube).then(s => s.maximized), { timeout: 4000 }).toBe(false);

	const restoredRect = await vulpOS.measure(cube);
	expect(Math.abs(restoredRect.width - beforeRect.width)).toBeLessThan(2);
	expect(Math.abs(restoredRect.x - before.x)).toBeLessThan(2);
	expect(Math.abs(restoredRect.y - before.y)).toBeLessThan(2);
});
