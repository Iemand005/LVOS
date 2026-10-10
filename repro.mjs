import { chromium } from 'playwright';
import fs from 'node:fs';

const out = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.on('console', m => console.log('PAGE:', m.type(), m.text()));
page.on('pageerror', e => console.log('PAGEERROR:', e.message));

await page.goto('http://localhost:3621/index.html');
await page.waitForFunction(() => typeof window.windowManager !== 'undefined', null, { timeout: 20000 });
await page.waitForTimeout(1000);

await page.evaluate(() => {
	window.windowManager.installApp('./Applications/Cube/cube.html', 'Cube', 'cube');
});
await page.evaluate(() => window.windowManager.windows['cube'].launch());
await page.waitForFunction(() => {
	const w = window.windowManager.windows['cube'];
	return w && w.target && w.isOpen;
}, null, { timeout: 20000 });
await page.waitForTimeout(1500);

console.log('startViewTransition:', await page.evaluate(() => typeof document.startViewTransition));
console.log('useViewTransitionMaximize:', await page.evaluate(() => window.flags.useViewTransitionMaximize));
console.log('compositorResize:', await page.evaluate(() => window.flags.compositorResize));

await page.evaluate(() => window.windowManager.windows['cube'].maximize());
await page.waitForFunction(() => window.windowManager.windows['cube'].maximized === true, null, { timeout: 5000 });
await page.waitForTimeout(800);

await page.evaluate(() => document.body.classList.add('slow-animations'));
await page.waitForTimeout(200);

const region = { x: 0, y: 0, width: 1000, height: 700 };
const pngs = [];
const start = Date.now();
await page.evaluate(() => window.windowManager.windows['cube'].toggleMaximized(false));
while (Date.now() - start < 3600) {
	const buf = await page.screenshot({ clip: region });
	pngs.push(buf);
}
console.log('captured frames:', pngs.length);
pngs.forEach((b, i) => fs.writeFileSync(out + '/' + String(i).padStart(3, '0') + '.png', b));

await browser.close();
