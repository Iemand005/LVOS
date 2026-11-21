import { test, expect } from './VulpOSTester';

test.use({ headless: true, channel: 'chrome' });

test('service worker enables navigation preload and registers static routes', async ({ vulpOS }) => {
	const state = await vulpOS.page.evaluate(async () => {
		let registration = (await navigator.serviceWorker.getRegistrations())[0];
		for (let i = 0; i < 150 && !(registration && registration.active); i++) {
			await new Promise(resolve => setTimeout(resolve, 100));
			registration = (await navigator.serviceWorker.getRegistrations())[0];
		}
		const preload = registration && (registration as any).navigationPreload;
		const enabled = preload && typeof preload.getState === 'function'
			? (await preload.getState()).enabled
			: false;
		const worker = registration && registration.active;
		const source = worker ? await (await fetch(worker.scriptURL)).text() : '';
		return {
			active: !!worker,
			enabled,
			hasRoutes: source.includes('addRoutes'),
			hasPreload: source.includes('preload.enable'),
			hasPreloadResponse: source.includes('preloadResponse')
		};
	});

	expect(state.active).toBe(true);
	expect(state.enabled).toBe(true);
	expect(state.hasRoutes).toBe(true);
	expect(state.hasPreload).toBe(true);
	expect(state.hasPreloadResponse).toBe(true);
});
