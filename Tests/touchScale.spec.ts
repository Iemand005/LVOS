import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

const readScale = (dialog: any) => dialog.evaluate((d: any) => {
	const content = d.content;
	const computed = getComputedStyle(content).scale;
	const value = computed === 'none' ? 1 : Number(computed.split(' ')[0]);
	return {
		value,
		origin: content.style.transformOrigin,
		inlineScale: content.style.scale,
		parentScale: d.target.style.scale,
		parentTransform: d.target.style.transform,
	};
});

test('touch press scales the content down and release restores it', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.setAnimations(true);

	const before = await readScale(window);
	expect(before.value).toBe(1);
	expect(before.parentScale).toBe('');

	const point = await vulpOS.titleBarPoint(window);
	const client = await vulpOS.page.context().newCDPSession(vulpOS.page);
	try {
		await client.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [{ x: point.x, y: point.y }],
		});
		await vulpOS.page.waitForTimeout(400);

		const held = await readScale(window);
		expect(held.value).toBeCloseTo(0.9, 2);
		expect(['center', 'center center']).toContain(held.origin);
		expect(held.parentScale).toBe('');
		expect(held.parentTransform).not.toContain('scale');

		await client.send('Input.dispatchTouchEvent', {
			type: 'touchEnd',
			touchPoints: [],
		});
		await vulpOS.page.waitForTimeout(400);

		const released = await readScale(window);
		expect(released.value).toBe(1);
		expect(released.inlineScale).toBe('');
	} finally {
		await client.detach();
	}
});
