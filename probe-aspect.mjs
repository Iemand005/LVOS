import { chromium } from 'playwright';

async function snap(withClass) {
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
	if (withClass) await page.evaluate(() => document.body.classList.add('preserve-aspect'));
	await page.evaluate(() => document.body.classList.add('slow-animations'));

	const p = page.evaluate(() => new Promise(resolve => {
		const read = s => { const cs = getComputedStyle(document.documentElement, s); return { w: cs.width, h: cs.height, of: cs.objectFit }; };
		const out = [];
		const start = performance.now();
		function tick() {
			out.push({ t: Math.round(performance.now() - start), old: read('::view-transition-old(window-fullscreen)'), nw: read('::view-transition-new(window-fullscreen)'), g: read('::view-transition-group(window-fullscreen)') });
			if (performance.now() - start < 2500) requestAnimationFrame(tick); else resolve(out);
		}
		window.windowManager.windows['cube'].toggleMaximized(false);
		tick();
	}));
	const r = await p;
	await browser.close();
	const mid = r.filter(x => { const w = parseFloat(x.g.w); return w > 450 && w < 950; }).slice(0, 4);
	console.log('preserve-aspect =', withClass);
	for (const x of mid) console.log(' ', x.t + 'ms old=' + x.old.w + 'x' + x.old.h + ' of=' + x.old.of + ' | new=' + x.nw.w + 'x' + x.nw.h + ' of=' + x.nw.of + ' | group=' + x.g.w + 'x' + x.g.h);
}

await snap(false);
await snap(true);