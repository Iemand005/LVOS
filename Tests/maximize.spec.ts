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
	// The scaled-max class stays while maximized: it keeps the !important transform
	// reset away so the inline scale stays authoritative.
	expect(maximized.scaledMaxClass).toBe(true);
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

/** Standard animated class path when compositorResize is explicitly disabled. */
test('maximize lands via standard class animation when compositor resize is disabled', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.setAnimations(true);
	await cube.evaluate((dialog: any) => {
		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;
		(globalThis as any).flags.compositorResize = false;
	});

	const before = await vulpOS.state(cube);
	const beforeRect = await vulpOS.measure(cube);

	await cube.evaluate((dialog: any) => dialog.maximize());
	await expect.poll(() => cube.evaluate((d: any) => d.maximized && !d.target.classList.contains('animating')), { timeout: 4000 }).toBe(true);

	const maxRect = await vulpOS.measure(cube);
	expect(Math.abs(maxRect.x - maxRect.sectionX)).toBeLessThan(2);
	expect(Math.abs(maxRect.y - maxRect.sectionY)).toBeLessThan(2);
	expect(Math.abs(maxRect.width - maxRect.sectionWidth)).toBeLessThan(2);
	expect(Math.abs(maxRect.height - maxRect.sectionHeight)).toBeLessThan(2);

	await cube.evaluate((dialog: any) => dialog.toggleMaximized(false));
	await expect.poll(() => cube.evaluate((d: any) => !d.maximized && !d.target.classList.contains('animating')), { timeout: 4000 }).toBe(true);

	const restoredRect = await vulpOS.measure(cube);
	expect(Math.abs(restoredRect.width - beforeRect.width)).toBeLessThan(2);
	expect(Math.abs(restoredRect.x - before.x)).toBeLessThan(2);
	expect(Math.abs(restoredRect.y - before.y)).toBeLessThan(2);
});

test('dragging down from a maximized window clears maximize state', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();
	await vulpOS.setAnimations(true);
	await cube.evaluate(() => {
		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;
		(globalThis as any).flags.compositorResize = true;
	});

	const snappedPoint = await vulpOS.titleBarPoint(cube);
	await vulpOS.drag(snappedPoint, { x: snappedPoint.x, y: 2 });
	await expect.poll(() => vulpOS.state(cube).then(s => s.maximized), { timeout: 4000 }).toBe(true);

	const dragPoint = await vulpOS.titleBarPoint(cube);
	await vulpOS.drag(dragPoint, { x: dragPoint.x, y: dragPoint.y + 220 });

	await expect.poll(() => cube.evaluate((dialog: any) => ({
		maximized: dialog.maximized,
		maximizedClass: dialog.target!.classList.contains('maximized'),
		scaledMaxClass: dialog.target!.classList.contains('scaled-max'),
		animatingClass: dialog.target!.classList.contains('animating'),
		animations: dialog.maximizeAnimations,
		maximizing: dialog._maximizing,
	})), { timeout: 4000 }).toEqual({
		maximized: false,
		maximizedClass: false,
		scaledMaxClass: false,
		animatingClass: false,
		animations: 0,
		maximizing: false,
	});

	const transform = await cube.evaluate((dialog: any) => dialog.target!.style.transform);
	expect(transform).not.toContain('scale(');
});

test('maximize button swaps its icon with maximize state', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	const icon = () => cube.evaluate(dialog => dialog.getButton(1)!.innerHTML);

	expect(await icon()).toContain('M0 0v10h10V0H0zm1 1h8v8H1V1z');

	await cube.evaluate(dialog => dialog.getButton(1)!.click());
	await expect.poll(() => vulpOS.state(cube).then(state => state.maximized), { timeout: 4000 }).toBe(true);
	expect(await icon()).toContain('M2.1 0v2H0v8.1h8.2v-2h2V0H2.1z');

	await cube.evaluate(dialog => dialog.getButton(1)!.click());
	await expect.poll(() => vulpOS.state(cube).then(state => state.maximized), { timeout: 4000 }).toBe(false);
	expect(await icon()).toContain('M0 0v10h10V0H0zm1 1h8v8H1V1z');
});
