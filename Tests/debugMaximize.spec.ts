import { test, expect } from './VulpOSTester';

test('debug compositor maximize hang', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();
	await vulpOS.setAnimations(true);
	await vulpOS.page.evaluate(() => { (globalThis as any).flags.useViewTransitionMaximize = false; });

	const info = await window.evaluate((dialog: any) => new Promise((resolve) => {
		const target = dialog.target as HTMLElement;
		const events: string[] = [];
		target.addEventListener('transitionend', (ev: TransitionEvent) => {
			events.push('transitionend:' + ev.propertyName + ' from ' + (ev.target === target ? 'window' : 'other:' + (ev.target as HTMLElement).tagName));
		});
		target.addEventListener('webkitTransitionEnd', (ev: Event) => {
			events.push('webkitTransitionEnd:' + (ev as TransitionEvent).propertyName);
		});

		const result: any[] = [];
		result.push({
			step: 'before',
			windowTarget: Boolean(dialog.windowTarget),
			prefixedStyle: 'webkitTransition' in document.documentElement.style,
			prefixedEventSupported: typeof (target as any).onwebkittransitionend !== 'undefined',
			bodyClass: document.body.className,
			computedTransition: getComputedStyle(target).transitionProperty,
			className: target.className,
		});

		dialog.maximize();

		setTimeout(() => {
			const state = target._animationState;
			result.push({
				step: 'after 800ms',
				className: target.className,
				maximized: dialog.maximized,
				maximizeAnimations: dialog.maximizeAnimations,
				stylePointerEvents: target.style.pointerEvents,
				styleTransform: target.style.transform,
				transitionProperty: getComputedStyle(target).transitionProperty,
				transitionDuration: getComputedStyle(target).transitionDuration,
				innerAnimating: target.classList.contains('animating'),
				animationState: state ? { active: state.active, timer: state.timer, handler: Boolean(state.handler) } : null,
				events,
			});
			resolve(result);
		}, 800);
	}));

	console.log(JSON.stringify(info, null, 1));
	expect(true).toBe(true);
});
