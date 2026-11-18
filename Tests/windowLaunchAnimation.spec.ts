import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('launching a window plays a scale and fade in', async ({ vulpOS }) => {
	await vulpOS.setAnimations(true);
	const dialog = await vulpOS.installApp('launch-animation', 'Launch Animation', './Applications/Cube/cube.html');

	await dialog.evaluate(d => {
		(window as any).__launchAnimations = [];
		d.target!.addEventListener('animationstart', (ev: AnimationEvent) => {
			(window as any).__launchAnimations.push(ev.animationName);
		});
	});

	await vulpOS.launchWindow(dialog);

	console.log('debug', await dialog.evaluate(d => ({ useAnimations: (window as any).flags.useAnimations, launching: d.target!.classList.contains('launching'), name: getComputedStyle(d.target!).animationName, cls: d.target!.className })));
	await expect.poll(() => dialog.evaluate(d => (window as any).__launchAnimations)).toContain('window-launch');
	await expect.poll(() => dialog.evaluate(d => d.target!.classList.contains('launching'))).toBe(false);
});
