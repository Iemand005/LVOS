import { test, expect } from '@playwright/test';

test.use({ headless: true, channel: 'chrome' });

test('mobile app frames can request fullscreen through LVMessenger', async ({ page }) => {
	await page.goto('http://localhost:3621/mobile.html');
	await page.waitForFunction(() =>
		typeof (window as any).__LVMessengerReceive === 'function' && Boolean((window as any).mobileFrameManager));

	await page.evaluate(() => {
		(window as any).__fullscreenRequests = [];
		(HTMLElement.prototype as any).requestFullscreen = function() {
			(window as any).__fullscreenRequests.push(
				this === (window as any).mobileFrameManager._frames.music ? 'music' : 'other');
			return Promise.resolve();
		};
		(window as any).mobileFrameManager.open({ id: 'music', title: 'Music', src: './example.html' });
		window.postMessage(JSON.stringify({ type: 'launchOverlay', data: '', id: 'music' }), '*');
	});

	await expect.poll(() => page.evaluate(() => {
		const frame = (window as any).mobileFrameManager?._frames?.music;
		let fullscreen = false;
		try { fullscreen = new URL(frame.src, location.href).searchParams.get('fullscreen') === 'true'; } catch {}
		return {
			fullscreen,
			requests: (window as any).__fullscreenRequests,
			container: document.getElementById('main-frame')?.classList.contains('fullscreen'),
		};
	}), { timeout: 5000 }).toEqual({ fullscreen: true, requests: ['music'], container: true });
});

test('desktop keeps the shared messenger bridge', async ({ page }) => {
	await page.goto('http://localhost:3621/');
	await page.waitForFunction(() => Boolean((window as any).windowManager));

	const bridged = await page.evaluate(() =>
		typeof (window as any).__LVMessengerReceive === 'function' &&
		(window as any).__LVMessengerReceive('os').windowManager === (window as any).windowManager);
	expect(bridged).toBe(true);
});
