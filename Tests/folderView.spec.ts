import { test, expect } from './VulpOSTester';

async function hideOverlays(page: import('@playwright/test').Page) {
	await page.evaluate(() => {
		document.getElementById('launchpad')?.setAttribute('style', 'display: none');
		document.getElementById('charms')?.setAttribute('style', 'display: none');
		const applist = document.getElementById('applist');
		if (applist && applist.parentElement) applist.parentElement.setAttribute('style', 'display: none');
	});
}

test('file view labels sit under a standard sized icon', async ({ vulpOS }) => {
	const item = vulpOS.page.locator('.folder-content li').first();
	await expect(item).toBeVisible();

	const icon = item.locator('img');
	const label = item.locator('label');
	await expect(icon).toBeVisible();
	await expect(label).toBeVisible();

	const layout = await item.evaluate(element => {
		const style = getComputedStyle(element);
		return { direction: style.flexDirection, align: style.alignItems };
	});
	expect(layout).toEqual({ direction: 'column', align: 'center' });

	const iconBox = await icon.boundingBox();
	expect(iconBox).not.toBeNull();
	expect(Math.abs(iconBox!.width - 48)).toBeLessThanOrEqual(1);
	expect(Math.abs(iconBox!.height - 48)).toBeLessThanOrEqual(1);

	const labelBox = await label.boundingBox();
	expect(labelBox).not.toBeNull();
	expect(labelBox!.y).toBeGreaterThanOrEqual(iconBox!.y + iconBox!.height - 1);
});

test('clicking a file selects it without opening a selection rectangle', async ({ vulpOS }) => {
	await hideOverlays(vulpOS.page);

	const item = vulpOS.page.locator('.folder-content .file-item').first();
	await item.click();

	expect(await item.evaluate(element => element.classList.contains('selected'))).toBe(true);
	expect(await vulpOS.page.locator('.folder-content .selector').count()).toBe(0);

	const style = await item.evaluate(element => {
		const computed = getComputedStyle(element);
		return {
			background: computed.backgroundColor,
			border: computed.borderTopColor,
			height: element.getBoundingClientRect().height,
		};
	});
	expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
	expect(style.border).toBe('rgb(0, 120, 255)');
	expect(style.height).toBeGreaterThanOrEqual(86);
});

test('native drag and drop moves a file into another folder', async ({ vulpOS }) => {
	await hideOverlays(vulpOS.page);
	await vulpOS.page.evaluate(() => {
		const target = document.createElement('article');
		target.className = 'folder-content';
		target.id = 'desktop-folder-2';
		target.style.left = '50%';
		target.style.width = '50%';
		document.getElementById('desktop-folder')!.parentNode!.appendChild(target);
		window.os.to(target).addFileView([]);
	});

	await vulpOS.page.evaluate(() => {
		(window as any).__dragLog = [];
		['dragenter', 'dragover', 'drop', 'dragend'].forEach(type => {
			document.addEventListener(type, ev => {
				const target = ev.target as HTMLElement;
				(window as any).__dragLog.push({
					type,
					phase: 'capture',
					target: `${target.tagName}#${target.id}.${target.className}`,
					prevented: ev.defaultPrevented,
					effect: (ev as DragEvent).dataTransfer?.dropEffect,
					payload: Helpers.hasLvosFilePayload(ev as DragEvent),
				});
			}, true);
			document.addEventListener(type, ev => {
				const target = ev.target as HTMLElement;
				(window as any).__dragLog.push({
					type,
					phase: 'bubble',
					target: `${target.tagName}#${target.id}.${target.className}`,
					prevented: ev.defaultPrevented,
					effect: (ev as DragEvent).dataTransfer?.dropEffect,
					payload: Helpers.hasLvosFilePayload(ev as DragEvent),
				});
			}, false);
		});
	});

	const item = vulpOS.page.locator('#desktop-folder .file-item').first();
	const target = vulpOS.page.locator('#desktop-folder-2');
	await item.dragTo(target, { targetPosition: { x: 20, y: 20 } });
	console.log('drag events', JSON.stringify(await vulpOS.page.evaluate(() => (window as any).__dragLog)));

	await expect(vulpOS.page.locator('#desktop-folder-2 .file-item')).toHaveCount(1);
	await expect(vulpOS.page.locator('#desktop-folder .file-item')).toHaveCount(0);
});

test('clicking empty space or a selected icon clears the selection', async ({ vulpOS }) => {
	await hideOverlays(vulpOS.page);

	const item = vulpOS.page.locator('#desktop-folder .file-item').first();
	await item.click();
	await expect(vulpOS.page.locator('#desktop-folder .file-item.selected')).toHaveCount(1);

	await vulpOS.page.locator('#desktop-folder').click({ position: { x: 400, y: 300 } });
	await expect(vulpOS.page.locator('#desktop-folder .file-item.selected')).toHaveCount(0);

	await item.click();
	await expect(vulpOS.page.locator('#desktop-folder .file-item.selected')).toHaveCount(1);
	await item.click();
	await expect(vulpOS.page.locator('#desktop-folder .file-item.selected')).toHaveCount(0);
});

test('dragging the selector selects files under the rectangle', async ({ vulpOS }) => {
	await hideOverlays(vulpOS.page);
	await vulpOS.page.evaluate(() => {
		window.os.to('desktop-folder').addFileView([
			{ name: 'One', icon: 'Assets/icon-192.png' },
			{ name: 'Two', icon: 'Assets/icon-192.png' },
		]);
	});

	await vulpOS.page.mouse.move(400, 300);
	await vulpOS.page.mouse.down();
	await vulpOS.page.mouse.move(0, 0, { steps: 8 });
	await vulpOS.page.mouse.up();

	expect(await vulpOS.page.locator('#desktop-folder .file-item.selected').count()).toBeGreaterThanOrEqual(2);
	await expect(vulpOS.page.locator('#desktop-folder .selector')).toHaveCount(0);
});

test('dropping a file on the desktop places it under the drop point', async ({ vulpOS }) => {
	await hideOverlays(vulpOS.page);

	const item = vulpOS.page.locator('#desktop-folder .file-item').first();
	await item.dragTo(vulpOS.page.locator('#desktop-folder'), { targetPosition: { x: 400, y: 300 } });

	await expect(vulpOS.page.locator('#desktop-folder > .file-item.placed')).toHaveCount(1);
	await expect(vulpOS.page.locator('#desktop-folder ul .file-item')).toHaveCount(0);

	const box = await vulpOS.page.locator('#desktop-folder > .file-item.placed').boundingBox();
	expect(box).not.toBeNull();
	expect(Math.abs(box!.x + box!.width / 2 - 400)).toBeLessThanOrEqual(12);
	expect(Math.abs(box!.y + box!.height / 2 - 300)).toBeLessThanOrEqual(12);
});
