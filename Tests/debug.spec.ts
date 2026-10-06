import { test } from './VulpOSTester';

test('debug drag', async ({ vulpOS, page }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	const point = await vulpOS.titleBarPoint(window);
	const probe = await window.evaluate((dialog, point) => {
		const el = document.elementFromPoint(point.x, point.y);
		return {
			point,
			titleBar: Boolean(dialog.titleBar),
			underCursor: el ? el.tagName + '.' + el.className : 'none',
			x: dialog.x, y: dialog.y, width: dialog.width, height: dialog.height,
		};
	}, point);
	console.log('PROBE', JSON.stringify(probe));

	await vulpOS.grabAt(point);
	const dragging = await page.evaluate(() => ({
		isDragging: windowManager.isDragging,
		hasActive: Boolean(windowManager.activeDialog),
	}));
	console.log('AFTER GRAB', JSON.stringify(dragging));

	await vulpOS.moveTo({ x: 2, y: 400 });
	const mid = await page.evaluate(() => ({
		isDragging: windowManager.isDragging,
		snapZone: windowManager._snapZone,
		pointer: { ...windowManager.pointerPosition },
		direction: windowManager.dragAction.direction,
	}));
	console.log('AFTER MOVE', JSON.stringify(mid));

	await vulpOS.release();
	const end = await window.evaluate(dialog => ({
		snapped: dialog.snapped,
		x: dialog.x, y: dialog.y,
	}));
	console.log('AFTER RELEASE', JSON.stringify(end));
});
