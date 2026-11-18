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
