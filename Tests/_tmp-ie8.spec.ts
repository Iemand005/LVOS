import { test, expect } from "@playwright/test";

test.use({ headless: true, channel: "chrome" });

test("IE8 accessor bundle boots", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("file:///C:/Users/Lasse/AppData/Local/Temp/opencode/ie8-page.html");
	await page.waitForFunction(() => Boolean((window as any).windowManager && (window as any).desktopManager && (window as any).flags), null, { timeout: 15000 });

	const initial = await page.evaluate(() => {
		const w = window as any;
		return {
			expose: w.__lvosGet(w.flags, "exposeAndDesktops"),
			transform: w.__lvosGet(w.flags, "useTransform"),
			hasBodyClass: document.body.classList.contains("exposé"),
			isExposeProperty: w.__lvosGet(w.desktopManager, "isExposé")
		};
	});
	expect(initial.expose).toBe(true);
	expect(typeof initial.isExposeProperty).toBe("boolean");

	await page.evaluate(() => {
		const w = window as any;
		w.__lvosSet(w.flags, "exposeAndDesktops", false);
	});

	const disabled = await page.evaluate(() => {
		const w = window as any;
		return {
			expose: w.__lvosGet(w.flags, "exposeAndDesktops"),
			hasBodyClass: document.body.classList.contains("exposé"),
			isExposeProperty: w.__lvosGet(w.desktopManager, "isExposé"),
			desktops: w.desktopManager.desktops ? w.desktopManager.desktops.length : 0
		};
	});
	expect(disabled.expose).toBe(false);
	expect(disabled.hasBodyClass).toBe(false);
	expect(disabled.isExposeProperty).toBe(false);

	expect(errors).toEqual([]);
});
