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

		const supportsPointer = typeof window !== 'undefined' && ("PointerEvent" in window || "MSPointerEvent" in window);
		const downType = supportsPointer ? "pointerdown" : "mousedown";
		const upType = supportsPointer ? "pointerup" : "mouseup";

		let event;
		if (supportsPointer && typeof PointerEvent !== 'undefined') {
			event = new PointerEvent(downType, { bubbles: true, cancelable: true, clientX: 120, clientY: 40, pointerId: 1, pointerType: 'mouse' });
		} else {
			event = new MouseEvent(downType, { bubbles: true, cancelable: true, clientX: 120, clientY: 40 });
		}
		target.dispatchEvent(event);
		const dragged = manager.isDragging;
		
		let upEvent;
		if (supportsPointer && typeof PointerEvent !== 'undefined') {
			upEvent = new PointerEvent(upType, { bubbles: true, cancelable: true, clientX: 120, clientY: 40, pointerId: 1, pointerType: 'mouse' });
		} else {
			upEvent = new MouseEvent(upType, { bubbles: true, cancelable: true, clientX: 120, clientY: 40 });
		}
		window.dispatchEvent(upEvent);
		document.dispatchEvent(upEvent);
		const released = !manager.isDragging;

		return { loadedWindows, dragged, released };
	});

	expect(result.loadedWindows, 'initializeDialogs() did not load the windows').toBeGreaterThan(0);
	expect(result.dragged, 'pointerdown did not start a drag').toBe(true);
	expect(result.released, 'pointerup did not end the drag').toBe(true);
});
