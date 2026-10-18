import { chromium } from '@playwright/test';

const url = 'file:///C:/Users/Lasse/AppData/Local/Temp/opencode/snap-variants.html';
const browser = await chromium.launch({ channel: 'chrome' });

for (const cls of ['a', 'b']) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.addInitScript((c) => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add(c);
    });
  }, cls);
  await page.goto(url);
  await page.waitForTimeout(300);

  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1200);
  const t1 = await page.evaluate(() => document.documentElement.scrollTop);

  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1200);
  const t2 = await page.evaluate(() => document.documentElement.scrollTop);

  console.log(`variant ${cls}: after 400 -> ${t1}, after +200 -> ${t2} (expect 0 or 800)`);
  await page.close();
}

await browser.close();
