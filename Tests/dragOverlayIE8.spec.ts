import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

/**
 * indexIE8.html is the HTML4 page that is also loaded by IE9. IE9 does not report
 * MouseEvent.buttons, so a drag's mousemove/mouseout used to look like a released
 * button and the global cleanup removed the drag overlay straight away. The overlay
 * has to survive every move of an active drag, and be gone once the drag ends.
 */
test.use({ headless: true, channel: 'chrome' });

test('indexIE8 keeps the drag overlay while dragging without MouseEvent.buttons', async ({ page }) => {
	await page.goto(pathToFileURL(resolve('indexIE8.html')).href);

	await page.waitForFunction(() =>
		typeof window.windowManager !== 'undefined' && window.windowManager.loaded !== false
	);

	const result = await page.evaluate(() => {
		const manager = window.windowManager;
		const dialog = manager.windows['console'];
		if (!dialog) return { error: 'no console dialog' };

		const overlay = () => document.body.querySelector('.drag-overlay');

		const event = document.createEvent('MouseEvents');
		event.initMouseEvent('mousedown', true, true, window, 1, 0, 0, 120, 40, false, false, false, false, 0, null);
		// IE9 has no `buttons`; make it undefined instead of Chrome's synthetic 0.
		Object.defineProperty(event, 'buttons', { value: undefined });

		dialog.activationHandler(event);
		const afterDown = !!overlay();

		// A move while the button is held: IE9 reports no `buttons` here either.
		const move = document.createEvent('MouseEvents');
		move.initMouseEvent('mousemove', true, true, window, 1, 0, 0, 140, 60, false, false, false, false, 0, null);
		Object.defineProperty(move, 'buttons', { value: undefined });
		window.dispatchEvent(move);
		document.dispatchEvent(move);
		const duringDrag = !!overlay();

		const up = document.createEvent('MouseEvents');
		up.initMouseEvent('mouseup', true, true, window, 1, 0, 0, 140, 60, false, false, false, false, 0, null);
		window.dispatchEvent(up);
		document.dispatchEvent(up);
		const afterUp = !!overlay();

		return { afterDown, duringDrag, afterUp, dragging: manager.isDragging };
	});

	expect(result.error).toBeUndefined();
	expect(result.afterDown, 'mousedown did not add the drag overlay').toBe(true);
	expect(result.duringDrag, 'mousemove removed the overlay of an active drag').toBe(true);
	expect(result.dragging, 'mouseup did not end the drag').toBe(false);
	expect(result.afterUp, 'mouseup did not remove the drag overlay').toBe(false);
});
