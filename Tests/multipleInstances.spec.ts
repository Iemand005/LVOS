import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

test.use({ headless: true, channel: 'chrome' });

/**
 * Apps with `multiple: true` spawn a fresh window per open (icon click / drop),
 * while plain apps keep reusing their single registered window.
 */
test('multiple apps spawn instances, single apps reuse', async ({ page }) => {
	await page.goto(pathToFileURL(resolve('Dist/index.html')).href);
	await page.waitForFunction(() => Boolean((window as any).desktopManager), null, { timeout: 15000 })
		.catch(() => {});

	const result = await page.evaluate(async () => {
		const wm = (window as any).windowManager;
		const base = './example.html';

		wm.loadApp({ id: 'single.test', title: 'Single', src: base });
		wm.loadApp({ id: 'multi.test', title: 'Multi', src: base, multiple: true });

		const idsFor = (id: string) =>
			Object.keys(wm.windows).filter((k) => k === id || k.indexOf(id + '#') === 0);
		const openFor = (id: string) =>
			idsFor(id).filter((k) => wm.windows[k].target).length;

		wm.windows['single.test'].buttons[0].click();
		wm.windows['single.test'].buttons[0].click();
		wm.windows['multi.test'].buttons[0].click();
		wm.windows['multi.test'].buttons[0].click();

		await new Promise((r) => setTimeout(r, 200));

		return {
			singleTotal: idsFor('single.test').length,
			singleOpen: openFor('single.test'),
			multiTotal: idsFor('multi.test').length,
			multiOpen: openFor('multi.test'),
		};
	});

	expect(result.singleOpen, 'single app should have one open window').toBe(1);
	expect(result.singleTotal, 'single app should not gain instances').toBe(1);
	expect(result.multiOpen, 'two opens of a multiple app should yield two windows').toBe(2);
	expect(result.multiTotal, 'base registration + two spawned instances').toBe(3);
});

test('dropping a multiple app spawns a new window instance', async ({ page }) => {
	await page.goto(pathToFileURL(resolve('Dist/index.html')).href);
	await page.waitForFunction(() => Boolean((window as any).desktopManager), null, { timeout: 15000 })
		.catch(() => {});

	const result = await page.evaluate(async () => {
		const wm = (window as any).windowManager;
		const app = { id: 'drop.multi', title: 'Drop Multi', src: './example.html', multiple: true };
		wm.loadApp(app);

		wm.dropApplication(app, 400, 300);
		wm.dropApplication(app, 460, 340);

		await new Promise((r) => setTimeout(r, 200));

		const ids = Object.keys(wm.windows).filter((k) => k === 'drop.multi' || k.indexOf('drop.multi#') === 0);
		return {
			total: ids.length,
			open: ids.filter((k) => wm.windows[k].target).length,
		};
	});

	expect(result.open, 'two drops should open two windows').toBe(2);
	expect(result.total, 'base registration + two spawned instances').toBe(3);
});
