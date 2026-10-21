import { test } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('why is the backdrop not transformed', async ({ vulpOS }) => {
	const messages: string[] = [];
	vulpOS.page.on('console', m => messages.push(m.type() + ': ' + m.text()));
	vulpOS.page.on('pageerror', e => messages.push('pageerror: ' + e.message));

	const cube = await vulpOS.openCube();
	await cube.evaluate((dialog: any) => dialog.move(260, 180));
	await vulpOS.page.waitForTimeout(500);

	const info = await cube.evaluate((dialog: any) => {
		const target = dialog.target;
		const clip = target.querySelector('.backdrop-filter');
		const backdrop = clip.firstElementChild as HTMLElement;
		const before = backdrop.style.transform;
		(window as any).updateMicaPosition(dialog);
		return {
			x: dialog.x,
			y: dialog.y,
			inlineTransform: before,
			afterManual: backdrop.style.transform,
			styleAttr: backdrop.getAttribute('style'),
			clipDisplay: getComputedStyle(clip).display,
			clipParentDisplay: getComputedStyle(clip.parentElement!).display,
			extensions: (window as any).windowManager.extensions.map((e: any) => ({ id: e.id, enabled: e.enabled })),
		};
	});

	console.log('info', JSON.stringify(info, null, 1));
	console.log('messages', JSON.stringify(messages, null, 1));
});
