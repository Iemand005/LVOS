import { chromium } from 'playwright';
import fs from 'node:fs';

const out = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE', m.type() + ':', m.text()); });

await page.goto('http://localhost:3621/index.html');
await page.waitForFunction(() => typeof window.windowManager !== 'undefined', null, { timeout: 20000 });
await page.waitForTimeout(800);

await page.evaluate(() => {
	window.windowManager.installApp('./Applications/Cube/cube.html', 'Cube', 'cube');
});
await page.evaluate(() => window.windowManager.windows['cube'].launch());
await page.waitForFunction(() => window.windowManager.windows['cube'].isOpen, null, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.evaluate(() => window.windowManager.windows['cube'].maximize());
await page.waitForFunction(() => window.windowManager.windows['cube'].maximized === true, null, { timeout: 5000 });
await page.waitForTimeout(600);

const logs = await page.evaluate(async () => {
	const rec = [];
	const w = window.windowManager.windows['cube'];
	const t = w.target;
	const before = {
		compositorAnimations: document.body.classList.contains('compositor-animations'),
		useViewTransitionMaximize: window.flags.useViewTransitionMaximize,
		compositorResize: window.flags.compositorResize,
		bodyClass: document.body.className
	};
	rec.push({ ts: 0, tag: 'BEFORE', ...before });
	const start = performance.now();
	const frame = () => {
		const r = t.getBoundingClientRect();
		rec.push({
			ts: Math.round(performance.now() - start),
			rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
			maximized: w.maximized,
			vt: document.activeViewTransition ? 'active' : 'none',
			vtName: t.style.viewTransitionName || getComputedStyle(t).viewTransitionName
		});
		requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
	await new Promise(r => setTimeout(r, 200));
	w.toggleMaximized(false);
	await new Promise(r => setTimeout(r, 3500));
	return { before, rec };
});

logs.rec.forEach(l => console.log(
	(l.rect ? l.ts + 'ms' : 'SNAP') ,
	'rect=' + (l.rect ? l.rect.join(',') : '-'),
	'max=' + l.maximized, 'vt=' + l.vt, 'vtName=' + l.vtName ?? ''
));

await browser.close();
fs.writeFileSync(out + '/diag.json', JSON.stringify(logs, null, 2));