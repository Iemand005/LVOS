import { test, expect } from './VulpOSTester';

/**
 * Pixel measurements of a layout that is not pixel-aligned to begin with: subpixel
 * rounding, and a border or two between the box CSS fills and the box we measure.
 */
function expectNear(actual: number, expected: number, tolerance = 4) {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

/**
 * The drag throttle queues the last move of a gesture behind a frame, so a fast
 * release lands before that frame has run. The frame must be applied as the resize it
 * was captured as, or it runs after the gesture was torn down — with dragAction
 * already reset to a plain move — and the window teleports to grab-position + cursor
 * delta while the size it just grew to stays behind.
 */
test('a release that outruns the drag frame keeps the resize instead of teleporting the window', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	const before = await vulpOS.state(window);
	// Direction 7 is bottom-right: the corner that grows the window without ever
	// touching its top-left edge, so any movement of x/y is a bug and not the resize.
	const sizer = await vulpOS.sizerPoint(window, 7);

	// The whole gesture runs inside one page task: pointerdown, a burst of moves and
	// the release, with no round trip in between that could let the queued frame run
	// first. That is the order a fast corner resize produces, held open long enough to
	// measure. The events are dispatched at the handlers directly rather than hit-tested,
	// so nothing (the drag overlay, z-order) can swallow part of the gesture.
	await vulpOS.page.evaluate(({ x, y, dx, dy }) => {
		const flags = (globalThis as any).flags;
		if (!flags.updateRateLimit) throw new Error('the drag throttle is what makes the release race possible');

		const sizer = document.querySelector('.sizer-7');
		if (!sizer) throw new Error('No bottom-right sizer on the page');

		const fire = (type: string, clientX: number, clientY: number, on: Element | Document) =>
			on.dispatchEvent(new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				clientX,
				clientY,
				pointerId: 1,
				pointerType: 'mouse',
				buttons: type === 'pointerup' ? 0 : 1,
			}));

		fire('pointerdown', x, y, sizer);
		const steps = 6;
		for (let i = 1; i <= steps; i++) {
			fire('pointermove', x + (dx * i) / steps, y + (dy * i) / steps, document);
		}
		fire('pointerup', x + dx, y + dy, sizer);
	}, { x: sizer.x, y: sizer.y, dx: 60, dy: 40 });

	// Two frames: the gesture's own was scheduled during the burst, so it runs before
	// the second of these — whatever the fix leaves queued is applied by now.
	await vulpOS.page.evaluate(() => new Promise<void>(resolve =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

	const after = await vulpOS.state(window);

	// A bottom-right resize keeps the top-left corner where it was: only the size grows,
	// by the distance the pointer travelled, and the release point is what lands.
	expect(after.x).toBe(before.x);
	expect(after.y).toBe(before.y);
	expectNear(after.width, before.width + 60, 1);
	expectNear(after.height, before.height + 40, 1);
});
