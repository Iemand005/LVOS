import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs';
import { gunzipSync } from 'zlib';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

test.use({ headless: true, channel: 'chrome' });

test('unity build boots from one HTML file with no script or stylesheet requests', async ({ page }) => {
	const out = mkdtempSync(join(tmpdir(), 'lvos-unity-'));
	try {
		execFileSync(process.execPath, [resolve('build.js'), '--unity', '--no-assets', '--out=' + out], {
			cwd: resolve('.'),
			stdio: 'pipe'
		});

		const html = readFileSync(join(out, 'unity.html'), 'utf8');
		expect(html, 'the unity page must not load scripts from files').not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
		expect(html, 'the unity page must not load stylesheets from files').not.toMatch(/<link\b[^>]*\brel\s*=\s*["']stylesheet/i);
		expect(html, 'the unity page must contain inline CSS').toContain('<style>');
		expect(html, 'the unity page must contain inline JS').toContain('<script>');
		expect(readFileSync(join(out, 'index.html'), 'utf8'), 'the normal page must stay unchanged')
			.toMatch(/<script\b[^>]*\bsrc\s*=/i);

		const gzip = readFileSync(join(out, 'unity.html.gz'));
		expect(gunzipSync(gzip).toString('utf8')).toBe(html);
		expect(gzip.length, 'gzip must be smaller than the plain page').toBeLessThan(Buffer.byteLength(html));
		expect(existsSync(join(out, 'unity.html.br')), 'brotli copy is missing').toBe(true);
		const packed = readFileSync(join(out, 'unity.packed.html'), 'utf8');
		expect(packed.length, 'packed page must be smaller than the plain page').toBeLessThan(html.length);

		const errors: string[] = [];
		page.on('pageerror', (exception) => errors.push(exception.message));
		await page.goto(pathToFileURL(join(out, 'unity.html')).href);
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

		const packedPage = await page.context().newPage();
		try {
			const packedErrors: string[] = [];
			packedPage.on('pageerror', (exception) => packedErrors.push(exception.message));
			await packedPage.goto(pathToFileURL(join(out, 'unity.packed.html')).href);
			await packedPage.waitForFunction(() => Boolean((window as any).windowManager), null, { timeout: 15000 })
				.catch(() => {});
			const packedState = await packedPage.evaluate(() => typeof (window as any).windowManager);
			expect(packedState, 'the self-decompressing page did not boot').not.toBe('undefined');
			expect(packedErrors.filter((message) => /is not defined|TabScroller|ScreenShooter|Graphics3D/.test(message)))
				.toEqual([]);
		} finally {
			await packedPage.close();
		}
	} finally {
		rmSync(out, { recursive: true, force: true });
	}
});
