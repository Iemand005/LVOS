
// TODO: make a standardplugin thing and a way to enforce exts to conform to it, do I make it a json object then? not really class based?

/** @param {Dialog} dialog */
function getMicaElement(dialog) {
	try { // TODO: cache the element so it doesn't have to be re-fetched each time! add _micaElement to the dialog thing as an optional prop
		if (!dialog.target) return;
		var clipElem = dialog.target.getElementsByClassName("backdrop-filter");
		if (!clipElem.length) return;
		var clip = clipElem[0];
		if (isElement(clip)) return clip;
	} catch(ex) { if (ex instanceof Error) console.log(ex.message); }
}

`1`11`1`1
/** @param {Dialog} dialog @returns {boolean} */
function injectMica(dialog) {
	try {
		if (!dialog.target) return false;
		var wallpaper = document.getElementById("wallpaper");
		if (!wallpaper) return false;
		// var newWallpaper = wallpaper.cloneNode(true);
		var wallpaperSrc = wallpaper.getAttribute("data-wallpaper-src") || "";
		var blurredSrc = wallpaper.getAttribute("data-blurred-src") || "";
		var preBlurredImage = blurredSrc !== null;
		var clip = dialog.micaElement;
		if (!clip) return false;
		while (clip.firstChild) clip.removeChild(clip.firstChild);


		var micaWallpaper = null;
		if (isElement(wallpaper.children[0])) {
			micaWallpaper = wallpaper.children[0].cloneNode(true);
			if (!(isElement(micaWallpaper))) return false;
			if (supportsObjectFit) {
				micaWallpaper.removeAttribute("style");
				micaWallpaper.className = "mica-backdrop";
				if (preBlurredImage &&  micaWallpaper instanceof HTMLIFrameElement && blurredSrc)
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
		dialog.target.classList.add("mica");

		return true;
	} catch(ex) { console.warn(ex); }
	return false;
};

window.windowManager.registerExtension({
	onWindowLaunch: function(dialog) {

	},
	onWindowMove: function(dialog) {
		if (!flags.useMica) return;
		var micaElement = getMicaElement(dialog);
		if (micaElement) try {
			var backdrop = micaElement.firstChild;
			var wallpaperP = document.getElementById("wallpaper");
			if (!wallpaperP) return;
			var wallpaperImage = wallpaperP.children[0];
			if (!(isElement(backdrop)) || !wallpaperImage) return;
			translateElement(backdrop, -dialog.x, -dialog.y);

			var wallpaperWidth = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientWidth ? wallpaperImage.clientWidth : wallpaperP.clientWidth;
			var wallpaperHeight = wallpaperImage instanceof HTMLImageElement && wallpaperImage.clientHeight ? wallpaperImage.clientHeight : wallpaperP.clientHeight;

			backdrop.style.width = toPixels(wallpaperWidth);
			backdrop.style.height = toPixels(wallpaperHeight);
		} catch(ex) { console.warn(ex); }
	}
});