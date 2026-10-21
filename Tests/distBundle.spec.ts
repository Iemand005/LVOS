import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve, join } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';

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

/**
 * The extensions are never baked into a bundle. The dist folder holds them as
 * files of their own that the page loads (deferred), so an extension can be
 * added, changed or left out without rebuilding the bundle.
 */
test('the dist loads the extensions as separate deferred scripts', async ({ page }) => {
	const bundle = readFileSync(resolve('Dist/desktop.dist.js'), 'utf8');
	const pageHtml = readFileSync(resolve('Dist/index.html'), 'utf8');

	// The extension is shipped as a file of its own.
	expect(existsSync(resolve('Dist/Scripts/Extensions/Mica.js')), 'the Mica extension is missing from the dist folder').toBe(true);

	// And the page loads it separately, deferred, after the bundle.
	expect(pageHtml, 'the page should load the extension as a deferred script').toContain(
		'<script src="./Scripts/Extensions/Mica.js" defer></script>'
	);

	// The bundle holds the framework, not the extension.
	expect(bundle, 'the bundle must not hold an extension implementation').not.toContain('MICA_WINDOW_CLASS');
	expect(bundle, 'the bundle must not hold an extension implementation').not.toContain('registerExtension(micaExtension');

	// The extension registers itself with the window manager when it loads.
	const pageErrors: string[] = [];
	page.on('pageerror', (exception) => pageErrors.push(exception.message));

	await page.goto(pathToFileURL(resolve('Dist/index.html')).href);

	await page.waitForFunction(() => Boolean((window as any).windowManager), null, { timeout: 15000 })
		.catch(() => {});

	const extensions = await page.evaluate(() => {
		const wm = (window as any).windowManager;
		return wm.extensions.map((extension: any) => ({ id: extension.id, enabled: extension.enabled }));
	});

	expect(extensions.some((extension: any) => extension.id === 'mica'), 'the Mica extension did not register itself').toBe(true);
	expect(pageErrors, 'the page threw:\n' + pageErrors.join('\n')).toEqual([]);
});

/**
 * The type declarations are only needed to type check the sources. The dist
 * folder runs in a browser, so it should not carry them.
 */
test('the dist folder holds no type declarations', () => {
	/** @param {string} folder */
	const typeDeclarations = (folder: string): string[] => {
		if (!existsSync(folder)) return [];
		const found: string[] = [];
		for (const entry of readdirSync(folder, { withFileTypes: true })) {
			const path = join(folder, entry.name);
			if (entry.isDirectory()) {
				found.push(...typeDeclarations(path));
			} else if (entry.name.endsWith('.d.ts')) {
				found.push(path);
			}
		}
		return found;
	};

	const found = typeDeclarations(resolve('Dist/Scripts'))
		.concat(typeDeclarations(resolve('Dist/Styles')));

	expect(found, 'the dist folder holds type declarations:\n' + found.join('\n')).toEqual([]);
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
