import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('an open window is restored after a reload', async ({ vulpOS }) => {
	await vulpOS.setAnimations(true);
	const dialog = await vulpOS.installApp('restore-test', 'Restore Test', './Applications/Cube/cube.html');
	await vulpOS.launchWindow(dialog);
	await dialog.evaluate(d => {
		d.move(200, 150, true, false);
		d.resize(320, 240);
	});

	console.log('before wait', await dialog.evaluate(d => ({ stateOpen: (d as any)._stateOpen, isOpen: d.isOpen, cls: d.target!.className, stored: localStorage.getItem('windowState') })));
	await vulpOS.page.waitForFunction(() => {
		try {
			const state = JSON.parse(localStorage.getItem('windowState') || '{}');
			return Boolean(state['restore-test'] && state['restore-test'].open);
		} catch (ex) { return false; }
	});

	const before = await vulpOS.state(dialog);
	await vulpOS.page.reload();
	await vulpOS.page.waitForFunction(() => Boolean(window.windowManager && window.windowManager.windows['restore-test']));

	const restored = await vulpOS.getWindow('restore-test');
	expect(await restored.evaluate(d => d.isOpen)).toBe(true);
	const after = await vulpOS.state(restored);
	expect(Math.abs(after.x - before.x)).toBeLessThan(2);
	expect(Math.abs(after.y - before.y)).toBeLessThan(2);
});
