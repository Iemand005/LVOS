import { test, expect } from './VulpOSTester';

test('debug snap', async ({ vulpOS }) => {
	const dialog = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	try {
		console.log('POINT', JSON.stringify(await vulpOS.titleBarPoint(dialog)));
	} catch (e) { console.log('POINT ERROR', (e as Error).message); }

	const before = await dialog.evaluate(d => {
		const bar = d.titleBar || d.target!;
		const rect = bar.getBoundingClientRect();
		const y = rect.y + rect.height / 2;
		const x = rect.x + rect.width / 2;
		const under = document.elementFromPoint(x, y);
		const snap = document.getElementById('window-snap');
		const candidates = [];
		for (let i = 1; i < 20; i++) {
			const cx = rect.x + (rect.width * i) / 20;
			const el = document.elementFromPoint(cx, y);
			candidates.push([Math.round(cx), el && el.tagName, el && (el as HTMLElement).className, el && el.closest('button, a, input, select, label, output, [contenteditable]') !== null]);
		}
		return {
			state: { x: d.x, y: d.y, width: d.width, height: d.height },
			header: d.titleBar && d.titleBar.outerHTML.slice(0, 500),
			rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
			candidates,
			under: under && under.outerHTML.slice(0, 300),
			snapClass: snap && snap.className,
			snapRect: snap && snap.getBoundingClientRect().toJSON(),
			flags: { aeroSnap: (window as any).flags.aeroSnap, updateRateLimit: (window as any).flags.updateRateLimit },
		};
	});
	console.log('BEFORE', JSON.stringify(before));

	const from = { x: before.rect.x + before.rect.w / 2, y: before.rect.y + before.rect.h / 2 };
	await vulpOS.grabAt(from);
	await vulpOS.moveTo({ x: 2, y: 400 });

	const during = await dialog.evaluate(d => {
		const snap = document.getElementById('window-snap');
		return {
			direction: (window as any).windowManager.dragAction.direction,
			zone: (window as any).windowManager._snapZone,
			snapClass: snap && snap.className,
			snapRect: snap && snap.getBoundingClientRect().toJSON(),
			dragging: (window as any).windowManager.isDragging,
		};
	});
	console.log('DURING', JSON.stringify(during));

	await vulpOS.release();
	const after = await dialog.evaluate(d => ({
		snapped: d.snapped,
		zone: (window as any).windowManager._snapZone,
		snapClass: document.getElementById('window-snap')!.className,
	}));
	console.log('AFTER', JSON.stringify(after));
	expect(true).toBe(true);
});
