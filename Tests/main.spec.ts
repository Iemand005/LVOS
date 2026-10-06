import { test, expect } from './VulpOSTester';

test('should verify the global windowManager object', async ({ vulpOS }) =>
	vulpOS.assertWindowManagerExists()
);

test('should verify the global appManager object', async ({ vulpOS }) =>
	vulpOS.assertAppManagerExists()
);

test('should install an app', async ({ vulpOS }) => {
	await vulpOS.installApp('cube', 'Cube');
});

test('should maximize and close an app', async ({ vulpOS }) => {
	const window = await vulpOS.openCube();

	await vulpOS.maximizeWindow(window);
	await vulpOS.assertWindowMaximized(window);

	await vulpOS.unmaximizeWindow(window);
	await vulpOS.assertWindowNotMaximized(window);

	await vulpOS.closeWindow(window);
	await vulpOS.assertWindowClosed(window);
});
