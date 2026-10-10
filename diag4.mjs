import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

await page.goto('http://localhost:3621/index.html');
await page.waitForFunction(() => typeof window.windowManager !== 'undefined', null, { timeout: 20000 });
await page.waitForTimeout(800);

await page.evaluate(() => window.windowManager.installApp('./Applications/Cube/cube.html', 'Cube', 'cube'));
await page.evaluate(() => window.windowManager.windows['cube'].launch());
await page.waitForFunction(() => window.windowManager.windows['cube'].isOpen, null, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => window.windowManager.windows['cube'].maximize());
await page.waitForFunction(() => window.windowManager.windows['cube'].maximized === true, null, { timeout: 5000 });
await page.waitForTimeout(400);
await page.evaluate(() => document.body.classList.add('slow-animations'));

const rec = await page.evaluate(async () => {
	const rec = [];
	const start = performance.now();
	let done = false;
	const read = (p) => {
		const cs = getComputedStyle(document.documentElement, '::view-transition-' + p);
		return cs ? {
			inset: cs.inset || '-',
			w: cs.width, h: cs.height, t: cs.transform,
			op: cs.opacity, mb: cs.mixBlendMode, anim: cs.animationName, disp: cs.display,
			of: cs.objectFit, op_pos: cs.objectPosition
		} : null;
	};
	const tick = () => {
		rec.push({
			t: Math.round(performance.now() - start),
			oldRoot: read('old(root)'),
			newRoot: read('new(root)'),
			oldWin: read('old(window-fullscreen)'),
			newWin: read('new(window-fullscreen)'),
			groupRoot: read('group(root)'),
			groupWin: read('group(window-fullscreen)'),
		});
		if (!done) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
	window.windowManager.windows['cube'].toggleMaximized(false);
	await new Promise(resolve => {
		const check = () => { if (!document.activeViewTransition) { done = true; resolve(); } else requestAnimationFrame(check); };
		requestAnimationFrame(check);
	});
	return rec;
});

const T = Math.round((rec[rec.length - 1].t - rec[0].t));
console.log('samples:', rec.length);
for (const r of rec.filter(x => x.t < 4000 && x.groupWin && x.groupWin.w !== 'auto')) {
	const g = Number.parseFloat(r.groupWin.w);
	if (g > 400 && g < 1000) console.log(
		r.t + 'ms',
		'|old(win):', r.oldWin ? r.oldWin.w + 'x' + r.oldWin.h + ' of=' + r.oldWin.of + ' pos=' + r.oldWin.op_pos + ' op=' + r.oldWin.op : '-',
		'|new(win):', r.newWin ? r.newWin.w + 'x' + r.newWin.h + ' of=' + r.newWin.of + ' pos=' + r.newWin.op_pos + ' op=' + r.newWin.op : '-',
		'|group:', r.groupWin.w + 'x' + r.groupWin.h
	);
}

await browser.close();