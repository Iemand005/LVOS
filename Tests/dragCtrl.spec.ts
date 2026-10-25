import { test, expect } from './VulpOSTester';

test('a plain dragstart is cancelled', async ({ vulpOS }) => {
	const dialog = await vulpOS.openCube();

	const prevented = await dialog.evaluate((w: any) => {
		const dataTransfer = new DataTransfer();
		const event = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer });
		w.target.dispatchEvent(event);
		return event.defaultPrevented;
	});

	expect(prevented).toBe(true);
});

test('a ctrl dragstart carries the application', async ({ vulpOS }) => {
	const dialog = await vulpOS.openCube();

	const result = await dialog.evaluate((w: any) => {
		const dataTransfer = new DataTransfer();
		const event = new DragEvent('dragstart', { bubbles: true, cancelable: true, ctrlKey: true, dataTransfer });
		w.target.dispatchEvent(event);
		return { prevented: event.defaultPrevented, json: dataTransfer.getData('application/json') };
	});

	expect(result.prevented).toBe(false);
	const state = JSON.parse(result.json);
	expect(state.app.id).toBe('cube');
	expect(state.state).toBeTruthy();
});

test('the title bar becomes draggable only while ctrl is held', async ({ vulpOS }) => {
	const dialog = await vulpOS.openCube();

	const result = await dialog.evaluate((w: any) => {
		const header = w.titleBar;
		const down = new PointerEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			pointerId: 1,
			pointerType: 'mouse',
		});
		w.target.dispatchEvent(down);
		const set = header.getAttribute('draggable');

		const end = new DragEvent('dragend', { bubbles: true });
		w.target.dispatchEvent(end);

		return { set, cleared: header.getAttribute('draggable') };
	});

	expect(result.set).toBe('true');
	expect(result.cleared).toBe(null);
});

test('drops app data that only exists in the legacy Text and URL formats', async ({ vulpOS }) => {
	const at = { x: 520, y: 320 };
	const payload = {
		app: { id: 'drop.legacy.app', title: 'Legacy App', src: './example.html' },
		state: { x: 0.9, y: 0.9 },
		offset: { x: 0, y: 0 },
	};

	await vulpOS.page.evaluate(({ payload, at }) => {
		const data = JSON.stringify(payload);
		const dataTransfer = {
			dropEffect: 'none',
			getData(type: string) {
				if (type === 'Text') return data;
				if (type === 'URL') return 'https://example.org/';
				throw new Error('Unsupported data type: ' + type);
			},
		};
		const event = new Event('drop', { bubbles: true, cancelable: true });
		Object.defineProperties(event, {
			dataTransfer: { value: dataTransfer },
			clientX: { value: at.x },
			clientY: { value: at.y },
		});
		document.body.dispatchEvent(event);
	}, { payload, at });

	await vulpOS.page.waitForFunction(() =>
		Boolean(window.windowManager.windows['drop.legacy.app'] && window.windowManager.windows['drop.legacy.app'].target)
	);

	const centre = await vulpOS.page.evaluate(() => {
		const w = window.windowManager.windows['drop.legacy.app'];
		const rect = w.target!.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	});

	expect(Math.abs(centre.x - at.x)).toBeLessThanOrEqual(6);
	expect(Math.abs(centre.y - at.y)).toBeLessThanOrEqual(6);
});
