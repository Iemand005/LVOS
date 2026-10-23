import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

/**
 * indexIE8.html has no launchpad, but the window manager still has to be initialized:
 * initializeDialogs() registers the pointerup/mouseup listener that ends a drag. When
 * it was skipped, a window stayed glued to the cursor because the release never fired.
 */
test.use({ headless: true, channel: 'chrome' });

test('indexIE8 windows initialize and release the pointer', async ({ page }) => {
	await page.goto(pathToFileURL(resolve('indexIE8.html')).href);

	await page.waitForFunction(() =>
		typeof window.windowManager !== 'undefined' && window.windowManager.loaded !== false
	);

	const result = await page.evaluate(() => {
		const manager = window.windowManager;
		const loadedWindows = Object.keys(manager.windows).length;

		const target = document.getElementById('console');
		if (!target) return { loadedWindows, dragged: false, released: true, error: 'no console' };

		const fire = (type: string) => {
			const event = new Event(type, { bubbles: true, cancelable: true });
			Object.defineProperty(event, 'clientX', { value: 120 });
			Object.defineProperty(event, 'clientY', { value: 40 });
			target.dispatchEvent(event);
		};

		fire('pointerdown');
		const dragged = manager.isDragging;
		window.dispatchEvent(new Event('pointerup', { bubbles: true }));
		const released = !manager.isDragging;

		return { loadedWindows, dragged, released };
	});

	expect(result.loadedWindows, 'initializeDialogs() did not load the windows').toBeGreaterThan(0);
	expect(result.dragged, 'pointerdown did not start a drag').toBe(true);
	expect(result.released, 'pointerup did not end the drag').toBe(true);
});
