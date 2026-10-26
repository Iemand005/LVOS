import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { readFileSync } from 'fs';

test.use({ headless: true, channel: 'chrome' });

/**
 * The IE8 build rewrites object-literal accessors and Object.defineProperty /
 * defineProperties accessors into get<Name>/set<Name> methods. indexIE8.html is
 * the generated page that loads that bundle.
 */
test('IE8 accessor bundle boots', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (exception) => pageErrors.push(exception.message));

	const pageHtml = readFileSync(resolve('Dist/indexIE8.html'), 'utf8');
	expect(pageHtml, 'indexIE8.html should load the accessor-free bundle').toContain(
		'<script src="./desktop.ie8.dist.js" defer></script>'
	);

	await page.goto(pathToFileURL(resolve('Dist/indexIE8.html')).href);
	await page.waitForFunction(
		() => Boolean((window as any).windowManager && (window as any).desktopManager && (window as any).flags),
		null,
		{ timeout: 15000 }
	);

	const initial = await page.evaluate(() => {
		const w = window as any;
		return {
			expose: w.__lvosGet(w.flags, 'exposeAndDesktops'),
			hasBodyClass: document.body.classList.contains('exposé'),
			isExposeSupported: typeof w.desktopManager.isExposéSupported === 'function'
		};
	});
	expect(initial.expose).toBe(true);
	expect(initial.hasBodyClass).toBe(true);
	expect(initial.isExposeSupported).toBe(true);

	await page.evaluate(() => {
		const w = window as any;
		w.__lvosSet(w.flags, 'exposeAndDesktops', false);
	});

	const disabled = await page.evaluate(() => {
		const w = window as any;
		return {
			expose: w.__lvosGet(w.flags, 'exposeAndDesktops'),
			hasBodyClass: document.body.classList.contains('exposé'),
			isExposeProperty: w.__lvosGet(w.desktopManager, 'isExposé')
		};
	});
	expect(disabled.expose).toBe(false);
	expect(disabled.hasBodyClass).toBe(false);
	expect(typeof disabled.isExposeProperty).toBe('boolean');

	expect(pageErrors, 'the IE8 bundle threw:\n' + pageErrors.join('\n')).toEqual([]);
});
