import { chromium } from 'playwright';
import fs from 'node:fs';

const out = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

const cdp = await page.context().newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
	frames.push({ i: frames.length, data, meta: metadata });
	await cdp.send('Page.screencastFrameAck', { sessionId });
});

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

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
await page.waitForTimeout(300);

const t0 = Date.now();
await page.evaluate(() => window.windowManager.windows['cube'].toggleMaximized(false));
await page.waitForTimeout(1500);
await cdp.send('Page.stopScreencast');

fs.writeFileSync(out + '/screencast-meta.json', JSON.stringify(frames));
console.log('frames:', frames.length);
await browser.close();