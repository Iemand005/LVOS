import { test, expect } from './VulpOSTester';

test('debug compositor maximize v4', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.setAnimations(true);

	const info = await cube.evaluate((dialog: any) => new Promise((resolve) => {
		const log: string[] = [];
		const target = dialog.target as HTMLElement;
		const proto = Object.getPrototypeOf(dialog);

		const origAnimate = proto.animate;
		proto.animate = function (onToggled: any, onTransitionEnd: any, onEnd: any, timeout: any, flip: any) {
			const stack = String(new Error().stack).split('\n').slice(2, 5).join(' <- ');
			log.push('animate timeout=' + timeout + ' flip=' + flip + ' | ' + stack);
			return origAnimate.apply(this, arguments);
		};

		target.addEventListener('transitionend', (ev: TransitionEvent) => {
			log.push('transitionend:' + ev.propertyName + ' from ' + (ev.target === target ? 'window' : 'other'));
		});

		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;

		dialog.maximize();
		const check = (ms: number) => setTimeout(() => {
			log.push('t=' + ms + ' state=' + (target._animationState ? 'active=' + target._animationState.active + ' timer=' + target._animationState.timer : 'null')
				+ ' classes=' + target.className + ' maximized=' + dialog.maximized);
		}, ms);
		check(100); check(500); check(1500);
		setTimeout(() => resolve(log), 1700);
	}));

	console.log(JSON.stringify(info, null, 1));
	expect(true).toBe(true);
});
