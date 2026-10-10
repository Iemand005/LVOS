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
	const tick = () => {
		for (const a of document.getAnimations()) {
			const target = a.effect && a.effect.target;
			let desc = null;
			if (target) {
				if (typeof target.pseudoElement === 'string') desc = (target.element ? target.element.tagName : '?') + target.pseudoElement;
				else desc = String(target);
			}
			rec.push({
				t: Math.round(performance.now() - start),
				name: a.animationName || '',
				pseudo: desc,
				opacity: a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().map(k => k.opacity) : []
			});
		}
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

const byKey = new Map();
for (const r of rec) {
	const k = r.pseudo + ' | ' + r.name + ' | ' + (r.opacity || []).join('->');
	if (!byKey.has(k)) byKey.set(k, []);
	byKey.get(k).push(r.t);
}
for (const [k, ts] of byKey) console.log(k, '->', [...new Set(ts)].length, 'frames over', Math.max(...ts) - Math.min(...ts), 'ms');

await browser.close();