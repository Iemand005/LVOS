
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

window.windowManager.registerExtension({
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