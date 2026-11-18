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

test('clicking a file selects it without opening a selection rectangle', async ({ vulpOS }) => {
	await vulpOS.page.evaluate(() => {
		document.getElementById('launchpad')?.setAttribute('style', 'display: none');
		document.getElementById('charms')?.setAttribute('style', 'display: none');
	});

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
	await vulpOS.page.evaluate(() => {
		document.getElementById('launchpad')?.setAttribute('style', 'display: none');
		document.getElementById('charms')?.setAttribute('style', 'display: none');
		const target = document.createElement('article');
		target.className = 'folder-content';
		target.id = 'desktop-folder-2';
		target.style.left = '50%';
		target.style.width = '50%';
		document.getElementById('desktop-folder')!.parentNode!.appendChild(target);
		window.os.to(target).addFileView([]);
	});

	const item = vulpOS.page.locator('#desktop-folder .file-item').first();
	const target = vulpOS.page.locator('#desktop-folder-2 ul');
	await item.dragTo(target);

	await expect(vulpOS.page.locator('#desktop-folder-2 .file-item')).toHaveCount(1);
	await expect(vulpOS.page.locator('#desktop-folder .file-item')).toHaveCount(0);
});
