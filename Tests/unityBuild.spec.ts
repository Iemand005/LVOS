import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

test.use({ headless: true, channel: 'chrome' });

test('unity build boots from one HTML file with no script or stylesheet requests', async ({ page }) => {
	const out = mkdtempSync(join(tmpdir(), 'lvos-unity-'));
	try {
		execFileSync(process.execPath, [resolve('build.js'), '--unity', '--out=' + out], {
			cwd: resolve('.'),
			stdio: 'pipe'
		});

		const html = readFileSync(join(out, 'index.html'), 'utf8');
		expect(html, 'the unity page must not load scripts from files').not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
		expect(html, 'the unity page must not load stylesheets from files').not.toMatch(/<link\b[^>]*\brel\s*=\s*["']stylesheet/i);
		expect(html, 'the unity page must contain inline CSS').toContain('<style>');
		expect(html, 'the unity page must contain inline JS').toContain('<script>');

		const errors: string[] = [];
		page.on('pageerror', (exception) => errors.push(exception.message));
		await page.goto(pathToFileURL(join(out, 'index.html')).href);
		await page.waitForFunction(() => Boolean((window as any).windowManager), null, { timeout: 15000 })
			.catch(() => {});

		const state = await page.evaluate(() => ({
			windowManager: typeof (window as any).windowManager,
			desktopManager: typeof (window as any).desktopManager,
			mica: (window as any).windowManager?.extensions?.some((extension: any) => extension.id === 'mica'),
			screenShooter: typeof (0, eval)('ScreenShooter')
		}));

		expect(state.windowManager, 'the inlined bundle did not boot').not.toBe('undefined');
		expect(state.desktopManager, 'the inlined bundle did not boot the desktop').not.toBe('undefined');
		expect(state.mica, 'the inlined extension did not register').toBe(true);
		expect(state.screenShooter, 'the inlined WebGraphics script is missing').toBe('function');
		expect(errors.filter((message) => /is not defined|TabScroller|ScreenShooter|Graphics3D/.test(message)))
			.toEqual([]);
	} finally {
		rmSync(out, { recursive: true, force: true });
	}
});
