var reflecitons = false;

// var isBlink = "chrome" in window;

/** @type {Launchpad?} */
var launchpad = typeof Launchpad !== "undefined" ? new Launchpad : null;

function init() {
	var launchpadElement = document.getElementById("launchpad");
	if (!launchpad || !launchpadElement) return;

	launchpad.init(launchpadElement);

	if (typeof appRegistry !== "undefined") {
		appRegistry.forEachApp(function(app, id) {
			launchpad.addApp(app);
		});
		// launchpad.open();
	} else if (typeof windowManager !== "undefined" && "windowManager" in window) {
		windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
		if (!isBlink) DesktopManager.removeTheme("glass");
		windowManager.initializeDialogs();
		toggleReflections(reflections);

		LVMessenger.receive(messageReceived);
	}



	

	window.metaThemeColor = document.querySelector("meta[name=\"theme-color\"]") || undefined;
	if (window.__LVMessenger)
		window.__LVMessenger.accent = window.metaThemeColor;
}

window.addEventListener("DOMContentLoaded", init, false);
