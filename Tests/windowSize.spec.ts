import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('a launched window has its size applied to the element', async ({ vulpOS }) => {
	const dialog = await vulpOS.installApp('cube', 'Cube', './Applications/Cube/cube.html');
	await vulpOS.launchWindow(dialog);
	await vulpOS.assertWindowOpen(dialog);

	const size = await dialog.evaluate(dialog => {
		const rect = dialog.target!.getBoundingClientRect();
		return {
			width: rect.width,
			height: rect.height,
			styleWidth: dialog.target!.style.width,
			styleHeight: dialog.target!.style.height
		};
	});

	expect(size.width).toBeGreaterThan(0);
	expect(size.height).toBeGreaterThan(0);
	expect(size.styleWidth).toBe('640px');
	expect(size.styleHeight).toBe('480px');
});
