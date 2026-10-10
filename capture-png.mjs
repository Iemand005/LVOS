import { chromium } from 'playwright';
import fs from 'node:fs';

const out = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes/png';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

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

const cdp = await page.context().newCDPSession(page);
const shot = async (label) => {
	const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
	const buf = Buffer.from(data, 'base64');
	fs.writeFileSync(out + '/' + label + '.png', buf);
	console.log('saved', label, buf.length);
};
await shot('00-max');
await page.evaluate(() => window.windowManager.windows['cube'].toggleMaximized(false));
for (let i = 1; i <= 16; i++) {
	await shot(String(i).padStart(2, '0'));
}
await page.waitForTimeout(2500);
await shot('99-rest');

await browser.close();