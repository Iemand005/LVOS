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
	} else if (typeof windowManager !== "undefined" && "windowManager" in window) {
		windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
	}
}

window.addEventListener("DOMContentLoaded", init, false);
