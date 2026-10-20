import { test, expect } from './VulpOSTester';

test('debug compositor maximize v2', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.setAnimations(true);
	await cube.evaluate((dialog: any) => {
		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;
	});

	const info = await cube.evaluate((dialog: any) => new Promise((resolve) => {
		const target = dialog.target as HTMLElement;
		const events: string[] = [];
		const t0 = performance.now();
		const stamp = () => Math.round(performance.now() - t0);
		target.addEventListener('transitionend', (ev: TransitionEvent) => {
			events.push(stamp() + ':transitionend:' + ev.propertyName + ' from ' + (ev.target === target ? 'window' : 'other:' + (ev.target as HTMLElement).tagName));
		});
		target.addEventListener('webkitTransitionEnd', (ev: Event) => {
			events.push(stamp() + ':webkitTransitionEnd:' + (ev as TransitionEvent).propertyName);
		});

		const snapshot = (step: string) => ({
			step,
			at: stamp(),
			className: target.className,
			maximized: dialog.maximized,
			maximizeAnimations: dialog.maximizeAnimations,
			pointerEvents: target.style.pointerEvents,
			styleTransform: target.style.transform,
			animationState: target._animationState
				? { active: target._animationState.active, timer: target._animationState.timer, handler: Boolean(target._animationState.handler) }
				: null,
			events: events.slice(),
		});

		const result: any[] = [snapshot('before')];
		dialog.maximize();
		result.push(snapshot('right after maximize()'));

		let step = 0;
		const timers = [400, 1500, 3000];
		timers.forEach((ms, i) => setTimeout(() => result.push(snapshot('+' + ms + 'ms (' + (++step) + ')')), ms));
		setTimeout(() => resolve(result), 3200);
	}));

	console.log(JSON.stringify(info, null, 1));
	expect(true).toBe(true);
});
