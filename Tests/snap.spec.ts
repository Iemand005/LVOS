import { test, expect } from './VulpOSTester';

/**
 * Pixel measurements of a layout that is not pixel-aligned to begin with: subpixel
 * rounding, and a border or two between the box CSS fills and the box we measure.
 */
function expectNear(actual: number, expected: number, tolerance = 4) {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

test('tiles a window dropped on the left edge and lets go when it is dragged away', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	// The pointer picks the zone, so the window tiles however it was grabbed, as long
	// as the pointer itself lands on the edge.
	await vulpOS.drag(await vulpOS.titleBarPoint(window), { x: 2, y: 400 });

	expect((await vulpOS.state(window)).snapped).toBe(true);

	const tiled = await vulpOS.measure(window);
	expectNear(tiled.width, tiled.sectionWidth / 2);
	expectNear(tiled.x, tiled.sectionX);

	// Away from every edge again, the floating geometry underneath comes straight back.
	const centre = {
		x: tiled.sectionX + tiled.sectionWidth / 2,
		y: tiled.sectionY + tiled.sectionHeight / 2,
	};
	await vulpOS.drag(await vulpOS.titleBarPoint(window), centre);

	expect((await vulpOS.state(window)).snapped).toBe(false);
});

test('offers full height while resizing to the bottom edge, and only snaps on release', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	const before = await vulpOS.state(window);
	const area = await vulpOS.measure(window);
	const bottomSizer = await vulpOS.sizerPoint(window, 3);

	// Hold the gesture on the edge: the indicator goes up to say what is on offer, but
	// the window is still its own until the drop says otherwise.
	await vulpOS.grabAt(bottomSizer);
	await vulpOS.moveTo({ x: bottomSizer.x, y: area.sectionY + area.sectionHeight - 1 });

	expect(await vulpOS.snapIndicatorShown()).toBe(true);
	const offered = await vulpOS.state(window);
	expect(offered.heightSnapped).toBe(false);
	// The resize that ran up to the edge is what leaves a size behind for the snap to
	// keep, so the gesture did have to change the window.
	expect(offered.height).toBeGreaterThan(before.height);

	await vulpOS.release();

	// Now the state is on: drawn edge to edge vertically while the geometry it keeps
	// underneath is the size the gesture left at, which is what leaving it hands back.
	const snapped = await vulpOS.state(window);
	expect(snapped.heightSnapped).toBe(true);
	expect(snapped.y).toBe(0);
	expect(snapped.height).toBe(offered.height);

	const drawn = await vulpOS.measure(window);
	expectNear(drawn.y, drawn.sectionY);
	expectNear(drawn.height, drawn.sectionHeight);
	expect(await vulpOS.snapIndicatorShown()).toBe(false);

	// Pulling it back down is the only thing that lets it go.
	const titleBar = await vulpOS.titleBarPoint(window);
	await vulpOS.drag(titleBar, { x: titleBar.x, y: titleBar.y + 120 });

	const released = await vulpOS.state(window);
	expect(released.heightSnapped).toBe(false);
	expect(released.height).toBe(offered.height);
	expectNear((await vulpOS.measure(window)).height, offered.height);
});

test('leaves a window alone when a resize never reaches the edge', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	const bottomSizer = await vulpOS.sizerPoint(window, 3);

	// Shrink from the bottom instead: the edge starts wherever the window was placed
	// and moves away from the screen, so there is nothing to offer.
	await vulpOS.grabAt(bottomSizer);
	await vulpOS.moveTo({ x: bottomSizer.x, y: bottomSizer.y - 150 });

	const shrunk = await vulpOS.measure(window);
	expect(shrunk.y + shrunk.height).toBeLessThan(shrunk.sectionY + shrunk.sectionHeight - 40);
	expect(await vulpOS.snapIndicatorShown()).toBe(false);

	await vulpOS.release();

	expect((await vulpOS.state(window)).heightSnapped).toBe(false);
	expect(await vulpOS.snapIndicatorShown()).toBe(false);
});
