import { test, expect } from './VulpOSTester';
import type { Page } from '@playwright/test';
import type { DialogHandle } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

/** How the window manager knows the Mica extension, and what the setting says. */
async function micaState(page: Page) {
	return page.evaluate(() => {
		const wm = (window as any).windowManager;
		const ext = wm.getExtension('mica');
		return {
			registered: Boolean(ext),
			id: ext ? ext.id : null,
			name: ext ? ext.name : null,
			enabled: ext ? ext.enabled === true : false,
			setting: (window as any).flags.useMica === true,
		};
	});
}

/** What a window looks like as far as Mica is concerned. */
async function micaOfWindow(dialog: DialogHandle) {
	return dialog.evaluate((dialog: any) => {
		const target = dialog.target!;
		const clip = target.querySelector('.backdrop-filter');
		const backdrop = clip ? clip.firstElementChild : null;
		return {
			hasClass: target.classList.contains('mica-window'),
			hasBackdrop: Boolean(backdrop),
			backdropClass: backdrop ? backdrop.className : '',
			transform: backdrop ? (backdrop as HTMLElement).style.transform : '',
			width: backdrop ? (backdrop as HTMLElement).style.width : '',
			height: backdrop ? (backdrop as HTMLElement).style.height : '',
			x: dialog.x,
			y: dialog.y,
		};
	});
}

/** The Mica extension, as the window manager knows it. */
async function setMicaEnabled(page: Page, enabled: boolean) {
	await page.evaluate((enabled) => {
		const wm = (window as any).windowManager;
		wm.setExtensionEnabled(wm.getExtension('mica'), enabled);
	}, enabled);
}

test('the Mica extension registers itself with the window manager', async ({ vulpOS }) => {
	const state = await micaState(vulpOS.page);

	expect(state.registered, 'the Mica extension should be registered').toBe(true);
	expect(state.id).toBe('mica');
	expect(state.name).toBe('Mica');
	expect(state.enabled, 'Mica should be on by default').toBe(true);
	expect(state.setting, 'the "Use Mica" setting should follow the extension').toBe(true);
});

test('a launched window carries a Mica backdrop', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	const mica = await micaOfWindow(cube);

	expect(mica.hasClass, 'the window should be marked as a Mica window').toBe(true);
	expect(mica.hasBackdrop, 'the window should have a backdrop').toBe(true);
	expect(mica.backdropClass).toContain('mica-backdrop');
	expect(mica.width, 'the backdrop should be as wide as the wallpaper').not.toBe('');
	expect(mica.height, 'the backdrop should be as tall as the wallpaper').not.toBe('');
});

test('the backdrop follows the window it belongs to', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();

	await cube.evaluate((dialog: any) => dialog.move(240, 160));

	const mica = await micaOfWindow(cube);
	expect(mica.x).toBeCloseTo(240, 0);
	expect(mica.y).toBeCloseTo(160, 0);
	expect(mica.transform, 'the backdrop should be moved the other way').toContain('-240px');
	expect(mica.transform).toContain('-160px');
});

test('switching Mica off takes the backdrop away and switching it on brings it back', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();

	await setMicaEnabled(vulpOS.page, false);

	const off = await micaOfWindow(cube);
	expect(off.hasClass, 'the window should no longer be a Mica window').toBe(false);
	expect(off.hasBackdrop, 'the backdrop should be gone').toBe(false);

	const offState = await micaState(vulpOS.page);
	expect(offState.enabled).toBe(false);
	expect(offState.setting, 'the "Use Mica" setting should follow the extension').toBe(false);

	await setMicaEnabled(vulpOS.page, true);

	const on = await micaOfWindow(cube);
	expect(on.hasClass).toBe(true);
	expect(on.hasBackdrop).toBe(true);

	const onState = await micaState(vulpOS.page);
	expect(onState.enabled).toBe(true);
	expect(onState.setting).toBe(true);
});

test('the "Use Mica" setting switches the extension', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();

	await vulpOS.page.evaluate(() => {
		(window as any).flags.useMica = false;
	});

	const off = await micaOfWindow(cube);
	expect(off.hasBackdrop, 'the setting should take the backdrop away').toBe(false);

	await vulpOS.page.evaluate(() => {
		(window as any).flags.useMica = true;
	});

	const on = await micaOfWindow(cube);
	expect(on.hasBackdrop, 'the setting should bring the backdrop back').toBe(true);
});

test('an extension that implements no hooks does not bother the window manager', async ({ vulpOS }) => {
	const result = await vulpOS.page.evaluate(() => {
		const wm = (window as any).windowManager;
		const before = wm.extensions.length;
		wm.registerExtension({ id: 'test.bare' });
		return { before, after: wm.extensions.length };
	});

	expect(result.after).toBe(result.before + 1);

	const cube = await vulpOS.openCube();
	const mica = await micaOfWindow(cube);
	expect(mica.hasBackdrop, 'Mica should still be doing its work').toBe(true);
});

test('an extension that throws is reported and does not take the window manager down', async ({ vulpOS }) => {
	const warnings: string[] = [];
	vulpOS.page.on('console', message => {
		if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text());
	});

	const threw = await vulpOS.page.evaluate(() => {
		const wm = (window as any).windowManager;
		wm.registerExtension({
			id: 'test.broken',
			onWindowMove() { throw new Error('this extension is broken'); },
		});
		return true;
	});
	expect(threw).toBe(true);

	const cube = await vulpOS.openCube();
	await cube.evaluate((dialog: any) => dialog.move(200, 120));

	const mica = await micaOfWindow(cube);
	expect(mica.hasBackdrop, 'Mica should still be doing its work').toBe(true);
	expect(warnings.some(text => text.includes('this extension is broken')), 'the failure should be reported').toBe(true);
});
