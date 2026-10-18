import { chromium } from '@playwright/test';

const url = 'file:///C:/Users/Lasse/AppData/Local/Temp/opencode/snap-test.html';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

async function report(label) {
  const info = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const cs = getComputedStyle(doc);
    return {
      scrollTop: doc.scrollTop,
      scrollHeight: doc.scrollHeight,
      clientHeight: doc.clientHeight,
      bodyHeight: body.getBoundingClientRect().height,
      snapType: cs.scrollSnapType,
      scrollingElement: document.scrollingElement === doc ? 'html' : 'body',
    };
  });
  console.log(label, JSON.stringify(info));
}

await page.goto(url);
await page.waitForTimeout(300);
await report('initial');

// wheel down in the middle
await page.mouse.move(500, 400);
await page.mouse.wheel(0, 400); // ~half page
await page.waitForTimeout(1200);
await report('after small wheel');

await page.mouse.wheel(0, 200);
await page.waitForTimeout(1200);
await report('after more wheel');

await page.mouse.wheel(0, 1500);
await page.waitForTimeout(1500);
await report('after big wheel');

await browser.close();
