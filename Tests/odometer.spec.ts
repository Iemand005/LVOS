import { test, expect } from './VulpOSTester';

test('the clock of the desktop shows the time in digits', async ({ vulpOS }) => {
	const clock = await vulpOS.page.evaluate(() => {
		const element = document.getElementById('clock') as any;
		if (!element) return null;

		const date = new Date(element.getAttribute('datetime'));
		const expected = [
			Math.floor(date.getHours() / 10), date.getHours() % 10,
			Math.floor(date.getMinutes() / 10), date.getMinutes() % 10,
			Math.floor(date.getSeconds() / 10), date.getSeconds() % 10,
		];

		const tracks = element.tracks.map((track: any) => {
			const match = /translateY\((-?[\d.]+)px\)/.exec(track.style.transform);
			if (!match) return null;
			return Math.round(-parseFloat(match[1]) / track.lineHeight) + 0;
		});

		return { tracks, expected, colons: (element.textContent.match(/:/g) || []).length };
	});

	expect(clock, 'the desktop should have a clock').not.toBeNull();
	expect(clock!.tracks.length, 'the clock should have a track for every digit').toBe(6);
	expect(clock!.tracks, 'the clock should show the time').toEqual(clock!.expected);
	expect(clock!.colons, 'the clock should have a colon between the groups').toBe(2);
});

test('an odometer with a value shows those digits', async ({ vulpOS }) => {
	const odometer = await vulpOS.page.evaluate(() => {
		const element = document.createElement('time', { is: 'odometer-time' }) as any;
		element.setAttribute('value', '12:34:56');
		document.body.appendChild(element);

		const tracks = element.tracks.map((track: any) => {
			const match = /translateY\((-?[\d.]+)px\)/.exec(track.style.transform);
			if (!match) return null;
			return Math.round(-parseFloat(match[1]) / track.lineHeight) + 0;
		});

		return { tracks, colons: (element.textContent.match(/:/g) || []).length };
	});

	expect(odometer.tracks.length, 'the value has a track for every digit').toBe(6);
	expect(odometer.tracks, 'the odometer should show the value').toEqual([1, 2, 3, 4, 5, 6]);
	expect(odometer.colons, 'the groups should be separated by a colon').toBe(2);
});

test('an odometer display shows a plain number', async ({ vulpOS }) => {
	const odometer = await vulpOS.page.evaluate(() => {
		const element = document.createElement('time', { is: 'odometer-display' }) as any;
		document.body.appendChild(element);
		element.init(3);
		element.value = 42;

		const tracks = element.tracks.map((track: any) => {
			const match = /translateY\((-?[\d.]+)px\)/.exec(track.style.transform);
			if (!match) return null;
			return Math.round(-parseFloat(match[1]) / track.lineHeight) + 0;
		});

		return { tracks, colons: (element.textContent.match(/:/g) || []).length };
	});

	expect(odometer.tracks.length, 'the display should have a track for every digit').toBe(3);
	expect(odometer.tracks, 'the display should show the number').toEqual([0, 4, 2]);
	expect(odometer.colons, 'a plain number has no colons').toBe(0);
});
