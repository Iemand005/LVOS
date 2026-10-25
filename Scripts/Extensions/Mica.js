"use strict";

/**
 * Mica: a backdrop for the windows, made of the desktop wallpaper.
 *
 * The extension owns everything Mica needs. It puts a copy of the wallpaper into
 * every window that is launched, keeps that copy lined up with the wallpaper while
 * the window is dragged around, and takes it away again when Mica is switched off.
 * The window manager knows nothing about any of this beyond the hooks below.
 */

/**
 * The class the extension puts on the windows it decorates. It is not the same as
 * the "mica" theme, which is a class on the body: the theme says how the desktop
 * looks, this class says which windows carry a backdrop.
 */
var MICA_WINDOW_CLASS = "mica-window";

/**
 * The element of a window that a backdrop is injected into.
 * @param {Dialog} dialog
 * @returns {HTMLElement | null}
 */
function getMicaElement(dialog) {
	try {
		if (!dialog || !dialog.target) return null;
		var clipElem = dialog.target.getElementsByClassName("backdrop-filter");
		if (!clipElem || !clipElem.length) return null;
		var clip = clipElem[0];
		if (isElement(clip)) return clip;
	} catch (ex) { if (ex instanceof Error) console.log(ex.message); }
	return null;
}

/**
 * The backdrop of a window, if it has one.
 * @param {Dialog} dialog
 * @returns {HTMLElement | null}
 */
function getMicaBackdrop(dialog) {
	var clip = getMicaElement(dialog);
	if (!clip) return null;
	var backdrop = clip.firstElementChild;
	return isElement(backdrop) ? backdrop : null;
}

/**
 * Puts a copy of the desktop wallpaper into the window, so the window shows the
 * wallpaper behind it. An older window is replaced by a fresh copy.
 * @param {Dialog} dialog
 * @returns {boolean} Whether the window got a backdrop.
 */
function injectMica(dialog) {
	try {
		if (!dialog || !dialog.target) return false;
		var wallpaper = document.getElementById("wallpaper");
		if (!wallpaper) return false;
		var wallpaperSrc = wallpaper.getAttribute("data-wallpaper-src") || "";
		var blurredSrc = wallpaper.getAttribute("data-blurred-src");
		var preBlurredImage = blurredSrc !== null;
		var clip = getMicaElement(dialog);
		if (!clip) return false;
		while (clip.firstChild) clip.removeChild(clip.firstChild);

		var micaWallpaper = null;
		if (isElement(wallpaper.children[0])) {
			micaWallpaper = wallpaper.children[0].cloneNode(true);
			if (!(isElement(micaWallpaper))) return false;
			// The copy is not the wallpaper itself, so it may not keep its id: the
			// desktop looks its wallpaper frame up by id.
			micaWallpaper.removeAttribute("id");
			if (supportsObjectFit) {
				micaWallpaper.removeAttribute("style");
				micaWallpaper.className = "mica-backdrop";
				if (preBlurredImage && micaWallpaper instanceof HTMLIFrameElement && blurredSrc)
					micaWallpaper.src = blurredSrc;
			} else {
				micaWallpaper.className = "mica-backdrop legacy-wallpaper-image";
				micaWallpaper.style.backgroundImage = "url('" + (blurredSrc || wallpaperSrc).replace(/'/g, "\\'") + "')";
			}
		} else {
			micaWallpaper = document.createElement("img");
			micaWallpaper.className = "mica-backdrop legacy-wallpaper-image";
			micaWallpaper.style.backgroundImage = "url('" + (blurredSrc || wallpaperSrc).replace(/'/g, "\\'") + "')";
		}

		clip.appendChild(micaWallpaper);
		dialog.target.classList.add(MICA_WINDOW_CLASS);

		// The backdrop is put in place right away, so it is already lined up with the
		// wallpaper before the window is moved for the first time.
		updateMicaPosition(dialog);

		return true;
	} catch (ex) { console.warn(ex); }
	return false;
}

/**
 * Lines the backdrop up with the wallpaper it was copied from. The backdrop is as
 * big as the wallpaper, so it has to be moved by the position of the window to keep
 * showing the same patch of wallpaper the desktop shows behind it.
 * @param {Dialog} dialog
 */
function updateMicaPosition(dialog) {
	try {
		var backdrop = getMicaBackdrop(dialog);
		if (!backdrop) return;
		var wallpaper = document.getElementById("wallpaper");
		if (!wallpaper) return;
		var wallpaperImage = wallpaper.children[0];
		if (!wallpaperImage) return;

		Helpers.translateElement(backdrop, -dialog.x, -dialog.y);

		var wallpaperWidth = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientWidth ? wallpaperImage.clientWidth : wallpaper.clientWidth;
		var wallpaperHeight = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientHeight ? wallpaperImage.clientHeight : wallpaper.clientHeight;

		backdrop.style.width = Helpers.toPixels(wallpaperWidth);
		backdrop.style.height = Helpers.toPixels(wallpaperHeight);
	} catch (ex) { console.warn(ex); }
}

/**
 * Takes the backdrop out of the window again.
 * @param {Dialog} dialog
 * @returns {boolean} Whether the window had a backdrop that was removed.
 */
function removeMica(dialog) {
	try {
		dialog.target.classList.remove(MICA_WINDOW_CLASS);
		var clip = getMicaElement(dialog);
		if (!clip) return false;
		while (clip.firstChild) clip.removeChild(clip.firstChild);
		return true;
	} catch (ex) { console.warn(ex); }
	return false;
}

/**
 * The Mica extension itself.
 * @type {Extension}
 */
var micaExtension = {
	id: "mica",
	name: "Mica",
	enabled: false,

	flags: {
		useMica: {
			enumerable: true,
			configurable: true,
			get: function() { return micaExtension.enabled === true; },
			set: function(value) { window.windowManager.setExtensionEnabled(micaExtension, !!value); }
		}
	},

	onWindowLaunch: injectMica,
	onWindowMove: updateMicaPosition,

	onEnable: function() {
		window.windowManager.forEachWindow(injectMica);
	},

	onDisable: function() {
		window.windowManager.forEachWindow(removeMica);
	}
};

window.windowManager.registerExtension(micaExtension);
