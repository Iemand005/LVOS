import { test } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('debug drag down from maximized', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();
	await vulpOS.setAnimations(true);
	await window.evaluate(() => {
		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;
		(globalThis as any).flags.compositorResize = true;
	});

	const inspect = () => window.evaluate((dialog: any) => ({
		className: dialog.target.className,
		maximized: dialog.maximized,
		animations: dialog.maximizeAnimations,
		maximizing: dialog._maximizing,
		state: window.windowManager ? null : null,
		targetTransform: dialog.target.style.transform,
		targetScale: dialog.target.style.scale,
		contentTransform: dialog.content && dialog.content.style.transform,
		contentScale: dialog.content && dialog.content.style.scale,
		animationState: !!dialog.target._animationState,
	}));

	const point = await vulpOS.titleBarPoint(window);
	await vulpOS.drag(point, { x: point.x, y: 2 });
	await vulpOS.page.waitForTimeout(700);
	console.log('maximized', JSON.stringify(await inspect(), null, 2));

	const down = await vulpOS.titleBarPoint(window);
	await vulpOS.drag(down, { x: down.x, y: down.y + 250 });
	await vulpOS.page.waitForTimeout(900);
	console.log('dragged down', JSON.stringify(await inspect(), null, 2));
});
