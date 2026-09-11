var reflecitons = false;

// var isBlink = "chrome" in window;

/** @type {Launchpad?} */
var launchpad = typeof Launchpad !== "undefined" ? new Launchpad : null;

function init() {
	var launchpadElement = document.getElementById("launchpad");
	if (!launchpad || !launchpadElement) return;

	launchpad.init(launchpadElement);

	if (typeof appRegistry !== "undefined") {
		appRegistry.forEachApp(launchpad.addApp.bind(launchpad));
		// launchpad.open();
		appRegistry.reloadWallpaper();
	}
	if (typeof windowManager !== "undefined" && "windowManager" in window) {
		windowManager.forEachWindow(function(dialog) {
			if (launchpad && dialog.application) launchpad.addApp(dialog);
		});
		if (!isBlink) DesktopManager.removeTheme("glass");
		windowManager.initializeDialogs();
		toggleReflections(false);

		LVMessenger.receive(messageReceived);
	}



	if (location.protocol === 'file:') {
		/**@type {NodeListOf<HTMLScriptElement>}*/
		var scripts = document.querySelectorAll('script[type="module"]');
		scripts.forEach(function (/**@type {HTMLScriptElement}*/s) {
			var replacement = document.createElement('script');
			replacement.src = s.src;
			s.replaceWith(replacement);
		});
	}

	window.metaThemeColor = document.querySelector("meta[name=\"theme-color\"]") || undefined;
	if (window.__LVMessenger)
		window.__LVMessenger.accent = window.metaThemeColor;
}

window.addEventListener("DOMContentLoaded", init, false);
