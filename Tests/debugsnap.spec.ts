import { test, expect } from './VulpOSTester';

test('debug touch tiling geometry', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	await vulpOS.page.evaluate(() => {
		window.flags.useAnimations = true;
	});

	const titleBar = await vulpOS.titleBarPoint(window);
	await vulpOS.touchDrag(titleBar, { x: 2, y: 400 });

	const dump = async (label: string) => {
		const info = await window.evaluate((w: any) => {
			const el = w.target as HTMLElement;
			const section = document.getElementById('window-section')!;
			const cs = getComputedStyle(el);
			const rowItems = section ? Array.from(section.children).filter(c => {
				return getComputedStyle(c).position !== 'absolute' || c.nodeName.toLowerCase() === 'template';
			}).map(c => {
				const cls = (c as HTMLElement).className;
				return (c as HTMLElement).tagName.toLowerCase() + '.' + (cls || '(noclass)') + ' pos=' + getComputedStyle(c).position;
			}) : [];
			return {
				snapped: w.snapped,
				rect: el.getBoundingClientRect().toJSON(),
				sectionW: section.getBoundingClientRect().width,
				parent: el.parentElement ? el.parentElement.className + '#' + el.parentElement.id : null,
				inlineFlex: el.style.flex,
				inlineOrder: el.style.order,
				computedWidth: cs.width,
				computedFlex: cs.flex,
				transform: cs.transform,
				translate: cs.translate,
				scale: cs.scale,
				transition: cs.transitionProperty,
				animating: el.classList.contains('animating'),
				flipping: el.classList.contains('flipping'),
				useScale: el.classList.contains('use-scale'),
				row: rowItems,
			};
		});
		console.log(label + ': ' + JSON.stringify(info, null, 1));
	};

	await dump('immediate');
	await vulpOS.page.waitForTimeout(50);
	await dump('at+50ms');
	await vulpOS.page.waitForTimeout(400);
	await dump('settled');
});

test('debug height snap release geometry', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.enableAeroSnap();

	await vulpOS.page.evaluate(() => {
		const wm = (window as any).windowManager;
		const proto = (window as any).Dialog ? null : null;
		const cube = wm.windows.cube;
		const origToggle = cube.toggleSnapped.bind(cube);
		cube.toggleSnapped = function (enable?: boolean) {
			if (enable) console.log('toggleSnapped(' + enable + ') ' + new Error().stack);
			return origToggle(enable);
		};
		const origTile = wm.tileDialog.bind(wm);
		wm.tileDialog = function (d: any, side: string) {
			console.log('tileDialog ' + side + ' ' + new Error().stack);
			return origTile(d, side);
		};
		const origZone = wm.getGestureSnapZone.bind(wm);
		wm.getGestureSnapZone = function (d: any, dir: number, x: number, y: number) {
			const zone = origZone(d, dir, x, y);
			if (zone) console.log('zone=' + zone + ' dir=' + dir + ' x=' + x + ' y=' + y);
			return zone;
		};
	});
	const logs: string[] = [];
	vulpOS.page.on('console', (m) => logs.push(m.text()));

	const area = await vulpOS.measure(window);
	const bottomSizer = await vulpOS.sizerPoint(window, 3);

	await vulpOS.grabAt(bottomSizer);
	await vulpOS.moveTo({ x: bottomSizer.x, y: area.sectionY + area.sectionHeight - 1 });
	await vulpOS.release();
	const snapped = await vulpOS.state(window);

	const titleBar = await vulpOS.titleBarPoint(window);
	console.log('titleBar=' + JSON.stringify(titleBar));
	await vulpOS.drag(titleBar, { x: titleBar.x, y: titleBar.y + 120 });

	const released = await vulpOS.state(window);
	const drawn = await vulpOS.measure(window);
	const styles = await window.evaluate((w: any) => {
		const el = w.target as HTMLElement;
		const cs = getComputedStyle(el);
		return {
			className: el.className,
			computedHeight: cs.height,
			computedTop: cs.top,
			computedTransform: cs.transform,
			parent: el.parentElement ? el.parentElement.className + '#' + el.parentElement.id : null,
		};
	});
	console.log(JSON.stringify({ titleBar, snapped, released, drawn, styles }, null, 1));
	console.log('LOGS:\n' + logs.join('\n'));
});
