import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

test.use({ headless: true, channel: 'chrome' });

/**
 * Boots the built Dist bundle straight from disk and checks that the scripts that
 * used to live in index.html are available: ScrollTabs and ElementPicker are part
 * of the bundle, while WebGraphics (only needed for the screenshot tool) is loaded
 * as separate deferred scripts.
 */
test('dist bundle boots with all index.html-only scripts available', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (exception) => pageErrors.push(exception.message));

	await page.goto(pathToFileURL(resolve('Dist/index.html')).href);

	await page.waitForFunction(() => Boolean((window as any).desktopManager), null, { timeout: 15000 })
		.catch(() => {});

	const names = [
		'windowManager',
		'desktopManager',
		'TabScroller',
		'Tab',
		'ScreenShooter',
		'CanvasMaker',
		'Graphics3D',
		'GraphicsBase',
		'ElementPicker',
	];

	// Class declarations are block-scoped (global lexical, not window props), so test
	// each name through eval() which resolves the shared global scope either way.
	const globals = await page.evaluate((names) => {
		const out: Record<string, string> = {};
		for (const name of names) out[name] = typeof (0, eval)(name);
		return out;
	}, names);

	expect(globals.windowManager, 'windowManager missing from bundle').not.toBe('undefined');
	expect(globals.desktopManager, 'desktopManager did not boot').not.toBe('undefined');
	expect(globals.TabScroller, 'TabScroller was not available').toBe('function');
	expect(globals.Tab, 'Tab was not available').toBe('function');
	expect(globals.ScreenShooter, 'ScreenShooter was not available').toBe('function');
	expect(globals.CanvasMaker, 'CanvasMaker was not available').toBe('function');
	expect(globals.Graphics3D, 'Graphics3D was not available').toBe('function');
	expect(globals.GraphicsBase, 'GraphicsBase was not available').toBe('function');
	expect(globals.ElementPicker, 'ElementPicker was not available').toBe('function');

	const fatal = pageErrors.filter((message) =>
		/TabScroller|ScreenShooter|CanvasMaker|Graphics3D|ElementPicker|is not defined/.test(message)
	);
	expect(fatal, 'bundle threw for a script that should be embedded:\n' + fatal.join('\n')).toEqual([]);
});

test('mobile bundle boots without errors', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (exception) => pageErrors.push(exception.message));

	await page.goto(pathToFileURL(resolve('Dist/mobile.html')).href);

	await page.waitForFunction(() => typeof (0, eval)('appManager') !== 'undefined', null, { timeout: 15000 })
		.catch(() => {});

	const globals = await page.evaluate(() => ({
		appManager: typeof (0, eval)('appManager'),
		Launchpad: typeof (0, eval)('Launchpad'),
		launchpad: typeof (0, eval)('launchpad'),
	}));

	expect(globals.appManager, 'appManager missing from mobile bundle').toBe('object');
	expect(globals.Launchpad, 'Launchpad missing from mobile bundle').toBe('function');
	expect(globals.launchpad, 'launchpad was not initialized').not.toBe('undefined');
	expect(pageErrors, 'mobile bundle threw:\n' + pageErrors.join('\n')).toEqual([]);
});
