import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await page.goto('http://localhost:3621/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.windowManager !== 'undefined' && window.windowManager.windows, null, { timeout: 20000 });
await page.waitForTimeout(800);
await page.evaluate(() => window.windowManager.installApp('./Applications/Cube/cube.html', 'Cube', 'cube'));
await page.evaluate(() => window.windowManager.windows['cube'].launch());
await page.waitForFunction(() => { const w = window.windowManager.windows['cube']; return w && w.target && w.isOpen; }, null, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => window.windowManager.windows['cube'].toggleMaximized());
await page.waitForFunction(() => window.windowManager.windows['cube'].maximized === true, null, { timeout: 10000 });
await page.waitForTimeout(500);
await page.evaluate(() => document.body.classList.add('slow-animations'));

const rows = await page.evaluate(() => new Promise(resolve => {
	const read = s => { const cs = getComputedStyle(document.documentElement, s); return { anim: cs.animationName, dur: cs.animationDuration, op: cs.opacity }; };
	const out = [];
	const start = performance.now();
	function tick() {
		out.push({
			t: Math.round(performance.now() - start),
			oldRoot: read('::view-transition-old(root)'),
			nwRoot: read('::view-transition-new(root)'),
			oldWin: read('::view-transition-old(window-fullscreen)'),
			nwWin: read('::view-transition-new(window-fullscreen)'),
		});
		if (performance.now() - start < 1500) requestAnimationFrame(tick); else resolve(out);
	}
	window.windowManager.windows['cube'].toggleMaximized(false);
	tick();
}));

for (const r of rows.filter((_, i) => i % 12 === 0).slice(0, 6)) {
	console.log(r.t + 'ms');
	console.log('  old(root):', r.oldRoot.anim + ' ' + r.oldRoot.dur + ' op=' + r.oldRoot.op, '| new(root):', r.nwRoot.anim + ' ' + r.nwRoot.dur + ' op=' + r.nwRoot.op);
	console.log('  old(win) :', r.oldWin.anim + ' ' + r.oldWin.dur + ' op=' + r.oldWin.op, '| new(win) :', r.nwWin.anim + ' ' + r.nwWin.dur + ' op=' + r.nwWin.op);
}
await browser.close();