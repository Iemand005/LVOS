/** @type {Launchpad?} */
var launchpad = typeof Launchpad !== "undefined" ? new Launchpad : null;

function init() {
	// launchpad = new Launchpad;

	var launchpadElement = document.getElementById("launchpad");
	if (launchpad && launchpadElement && "windowManager" in window) {
		launchpad.init(launchpadElement);
	
		window.windowManager.forEachWindow(function(dialog) {
			if (launchpad && dialog.application) launchpad.addApp(dialog);
		});
	}
}

window.addEventListener("load", init, false);
