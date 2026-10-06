import { test, expect } from './VulpOSTester';

test('diagnose title bar hit testing', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	const info = await window.evaluate(window => {
		const bar = window.titleBar || window.target!;
		const rect = bar.getBoundingClientRect();
		const y = rect.y + rect.height / 2;
		const samples: any[] = [];

		for (let i = 6; i <= 14; i++) {
			const x = rect.x + (rect.width * i) / 20;
			const under = document.elementFromPoint(x, y);
			samples.push({
				x,
				under: under ? (under.tagName + '.' + (under.className || '')).slice(0, 80) : null,
				inBar: under ? bar.contains(under) : false,
				rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
				tag: bar.tagName, cls: bar.className,
				visible: !!(rect.width && rect.height),
			});
		}

		return { samples, titleBarExists: !!window.titleBar, id: window.id };
	});

	console.log(JSON.stringify(info, null, 2));
	expect(info.titleBarExists).toBe(true);
});
