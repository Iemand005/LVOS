import { test } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('debug sizers', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	console.log(JSON.stringify(await window.evaluate(dialog => {
		const point = { x: 320, y: 135 };
		const under = document.elementFromPoint(point.x, point.y);
		const sizers = Array.from(dialog.target!.children)
			.filter(el => el.className && String(el.className).includes('sizer'))
			.map(el => ({ cls: el.className, rect: el.getBoundingClientRect().toJSON() }));
		return { point, under: under && { tag: under.tagName, cls: under.className }, targetRect: dialog.target!.getBoundingClientRect().toJSON(), targetStyle: { width: dialog.target!.style.width, height: dialog.target!.style.height, transform: dialog.target!.style.transform }, computed: getComputedStyle(dialog.target!).width + 'x' + getComputedStyle(dialog.target!).height, sizers };
	}), null, 2));
});
