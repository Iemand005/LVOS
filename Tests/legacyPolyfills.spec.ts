import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test.use({ headless: true, channel: 'chrome' });

const polyfillSource = readFileSync(resolve('Scripts/LegacyPolyfills.js'), 'utf8');

/**
 * IE11 has no CSS, BroadcastChannel or Object.assign. The polyfills must define
 * them on the global object, otherwise ScrollTabs.js dies on CSS.supports and
 * WindowManager/ProvisionedApps die on BroadcastChannel/Object.assign.
 */
test('LegacyPolyfills provides CSS, BroadcastChannel and Object.assign', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (exception) => pageErrors.push(exception.message));

	await page.goto('about:blank');

	const stripped = await page.evaluate(() => {
		const strip = (target: any, key: string) => {
			try {
				Object.defineProperty(target, key, { value: undefined, configurable: true, writable: true });
				return (target as any)[key] === undefined;
			} catch {
				return false;
			}
		};
		return {
			CSS: strip(window, 'CSS'),
			BroadcastChannel: strip(window, 'BroadcastChannel'),
			assign: strip(Object, 'assign'),
		};
	});

	expect(stripped.CSS, 'could not hide window.CSS').toBe(true);
	expect(stripped.BroadcastChannel, 'could not hide window.BroadcastChannel').toBe(true);
	expect(stripped.assign, 'could not hide Object.assign').toBe(true);

	// Inject as a classic script so the file runs in the global scope, like IE11 would.
	await page.evaluate((code) => {
		const script = document.createElement('script');
		script.textContent = code;
		document.head.appendChild(script);
	}, polyfillSource);

	expect(pageErrors, 'LegacyPolyfills.js threw:\n' + pageErrors.join('\n')).toEqual([]);

	const globals = await page.evaluate(() => {
		const BC = (window as any).BroadcastChannel;
		const out: any = {
			assignType: typeof Object.assign,
			assigned: typeof Object.assign === 'function' ? Object.assign({ a: 1 }, { b: 2, c: 3 }) : null,
			cssType: typeof (window as any).CSS,
			supports: null,
			channelType: typeof BC,
			received: [] as any[],
			afterClose: [] as any[],
		};

		if (typeof (window as any).CSS === 'function' || typeof (window as any).CSS === 'object') {
			try { out.supports = (window as any).CSS.supports('animation-timeline', 'scroll()'); }
			catch (ex) { out.supports = 'threw: ' + ex; }
		}

		if (typeof BC === 'function') {
			const a = new BC('lvos-test');
			const b = new BC('lvos-test');
			b.onmessage = (ev: any) => out.received.push(ev.data);
			a.postMessage('hello');
			a.postMessage({ n: 1 });
			a.close();
			b.close();
			try { a.postMessage('after close'); } catch (ex) { out.closedThrew = String(ex); }

			const c = new BC('lvos-other');
			const d = new BC('lvos-other');
			d.onmessage = (ev: any) => out.afterClose.push(ev.data);
			d.close();
			c.postMessage('nobody listening');
			c.close();
		}

		return out;
	});

	expect(globals.assignType, 'Object.assign was not polyfilled').toBe('function');
	expect(globals.assigned).toEqual({ a: 1, b: 2, c: 3 });

	expect(globals.cssType, 'window.CSS was not polyfilled').not.toBe('undefined');
	expect(globals.supports, 'CSS.supports must be a static function returning false').toBe(false);

	expect(globals.channelType, 'window.BroadcastChannel was not polyfilled').toBe('function');
	expect(globals.received, 'closed channels must not be delivered to').toEqual(['hello', { n: 1 }]);
	expect(globals.closedThrew, 'postMessage on a closed channel must be a no-op').toBeUndefined();
	expect(globals.afterClose).toEqual([]);
});

test('LegacyPolyfills loads before every other script in index.html', () => {
	const html = readFileSync(resolve('index.html'), 'utf8');
	const tag = /<script[^>]*LegacyPolyfills[^>]*>/.exec(html)?.[0] ?? '';

	expect(tag, 'LegacyPolyfills script tag missing from index.html').not.toBe('');
	expect(tag).toContain('nomodule');
	// A deferred tag runs *after* every blocking script in IE11, which left
	// WindowManager.js without BroadcastChannel and ScrollTabs.js without CSS.
	expect(tag, 'LegacyPolyfills must not be deferred').not.toContain('defer');
});
