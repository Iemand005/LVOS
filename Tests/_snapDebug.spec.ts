import { test, expect } from './VulpOSTester';

test('debug touch snap', async ({ vulpOS }) => {
	const dialog = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();
	await vulpOS.setAnimations(true);

	const point = await vulpOS.titleBarPoint(dialog);
	await vulpOS.touchDrag(point, { x: 2, y: 400 });

	const result = await dialog.evaluate(d => {
		const wm = (window as any).windowManager;
		const snap = document.getElementById('window-snap');
		return {
			snapped: d.snapped,
			isTouchDrag: wm.isTouchDrag,
			dragging: wm.isDragging,
			direction: wm.dragAction.direction,
			zone: wm._snapZone,
			snapClass: snap && snap.className,
			snapRect: snap && snap.getBoundingClientRect().toJSON(),
			flags: { aeroSnap: (window as any).flags.aeroSnap, useAnimations: (window as any).flags.useAnimations },
		};
	});
	console.log('TOUCH', JSON.stringify(result));
	expect(true).toBe(true);
});
