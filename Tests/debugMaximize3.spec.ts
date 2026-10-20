import { test, expect } from './VulpOSTester';

test('debug compositor maximize v3', async ({ vulpOS }) => {
	const cube = await vulpOS.openCube();
	await vulpOS.setAnimations(true);

	const info = await cube.evaluate((dialog: any) => new Promise((resolve) => {
		const log: string[] = [];
		const target = dialog.target as HTMLElement;

		const proto = Object.getPrototypeOf(dialog);
		const origToggleClassAnimated = proto.toggleClassAnimated;
		proto.toggleClassAnimated = function (className: string, force: any, onTransitionEnd: any, onEnd: any, onToggled: any, timeout: any) {
			log.push('toggleClassAnimated ' + className + ' timeout=' + timeout);
			const wrappedEnd = onEnd ? function (enabled: any) {
				log.push('onEnd-enter className=' + className + ' enabled=' + enabled);
				try { return onEnd.apply(this, arguments); }
				catch (e) { log.push('onEnd-THREW ' + (e as Error).message); throw e; }
			} : onEnd;
			const wrappedToggled = onToggled ? function (enabled: any) {
				log.push('onToggled className=' + className + ' enabled=' + enabled + ' classNow=' + target.className);
				return onToggled.apply(this, arguments);
			} : onToggled;
			return origToggleClassAnimated.call(this, className, force, onTransitionEnd, wrappedEnd, wrappedToggled, timeout);
		};

		const origToggle = target.classList.toggle.bind(target.classList);
		(target.classList as any).toggle = function (token: string, force?: any) {
			if (token === 'maximized' || token === 'scaled-max') log.push('classList.toggle ' + token + ' force=' + force + ' from ' + target.className);
			return origToggle(token, force as any);
		};

		const origMaximize = dialog.maximize.bind(dialog);
		dialog.maximize = function () {
			log.push('maximize() vtFlag=' + (globalThis as any).flags.useViewTransitionMaximize);
			return origMaximize();
		};

		dialog.toggleClassAnimated('probe', true, undefined, undefined, undefined, undefined);
		log.push('probe result classes=' + target.className);
		target.classList.remove('probe');
		target.classList.remove('animating');

		(globalThis as any).flags.useTransform = true;
		(globalThis as any).flags.useViewTransitionMaximize = false;

		dialog.maximize();
		setTimeout(() => {
			log.push('END classes=' + target.className + ' maximized=' + dialog.maximized + ' animations=' + dialog.maximizeAnimations + ' pe=' + target.style.pointerEvents);
			resolve(log);
		}, 2000);
	}));

	console.log(JSON.stringify(info, null, 1));
	expect(true).toBe(true);
});
