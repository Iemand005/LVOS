import { test, expect } from './VulpOSTester';

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

test('file items drag without opening a selection rectangle', async ({ vulpOS }) => {
	const item = vulpOS.page.locator('.folder-content .file-item').first();
	await expect(item).toBeVisible();

	const box = await item.boundingBox();
	expect(box).not.toBeNull();

	const startX = box!.x + box!.width / 2;
	const startY = box!.y + box!.height / 2;
	await vulpOS.page.mouse.move(startX, startY);
	await vulpOS.page.mouse.down();
	await vulpOS.page.mouse.move(startX + 80, startY + 40, { steps: 5 });
	await vulpOS.page.mouse.up();

	expect(await vulpOS.page.locator('.folder-content .selector').count()).toBe(0);
	expect(await item.evaluate(element => ({
		x: (element as any)._fileDragX,
		y: (element as any)._fileDragY,
	}))).toEqual({ x: 80, y: 40 });
});
