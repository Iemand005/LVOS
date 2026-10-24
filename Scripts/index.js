/** @type {Launchpad?} */
var launchpad = typeof Launchpad !== "undefined" ? new Launchpad : null;

function init() {
	var launchpadElement = document.getElementById("launchpad");

	if (launchpad && launchpadElement) {
		launchpad.init(launchpadElement);

		if (typeof appManager !== "undefined") {
			appManager.forEachApp(launchpad.addApp.bind(launchpad));
			// launchpad.open();
			appManager.reloadWallpaper();
		}
	}
	// The window manager must be initialized even on pages without a launchpad:
	// initializeDialogs() registers the document/window pointerup listener that ends
	// a drag, so skipping it leaves every window stuck to the cursor.
	if (typeof windowManager !== "undefined" && "windowManager" in window) {
		if (launchpad) windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
		if (!isBlink) DesktopManager.removeTheme("glass");
		windowManager.initializeDialogs();

		LVMessenger.receive(messageReceived);
	}



	if (location.protocol === 'file:') {
		/**@type {NodeListOf<HTMLScriptElement>}*/
		var scripts = document.querySelectorAll('script[type="module"]');
		scripts.forEach(function (/**@type {HTMLScriptElement}*/s) {
			var replacement = document.createElement('script');
			replacement.src = s.src;
			try {

				s.replaceWith(replacement);
			} catch(ex) {}
		});
	}

	window.metaThemeColor = document.querySelector("meta[name=\"theme-color\"]") || undefined;
	if (window.__LVMessenger)
		window.__LVMessenger.accent = window.metaThemeColor;
}

function ready(fn) {
	if (document.readyState === "complete" || document.readyState === "interactive") {
		setTimeout(fn, 0);
		return;
	}
	window.addEventListener("DOMContentLoaded", fn, false);
}
ready(init);


if (document.documentMode === 9) {
    var script = document.createElement("script");
    script.src = "./Scripts/Animation.js";
    document.getElementsByTagName("head")[0].appendChild(script);
}