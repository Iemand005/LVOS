import { chromium } from '@playwright/test';

const url = 'file:///C:/Users/Lasse/AppData/Local/Temp/opencode/snap-sanity.html';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await page.goto(url);
await page.waitForTimeout(300);

// sanity for element scroller C
await page.evaluate(() => { document.getElementById('c').style.display = 'block'; document.getElementById('d').style.display = 'none'; });
await page.waitForTimeout(100);
await page.mouse.move(500, 400);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(1000);
const cScroll = await page.evaluate(() => {
  const el = document.getElementById('c');
  return { top: el.scrollTop, h: el.scrollHeight, ch: el.clientHeight };
});
console.log('C element scroller:', JSON.stringify(cTop => ({}), JSON.stringify(cRes(c)).valueOf());
function noop(){}

