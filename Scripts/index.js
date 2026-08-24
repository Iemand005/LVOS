/** @type {Launchpad?} */
var launchpad = Launchpad ? new Launchpad : null;

function init() {
	// launchpad = new Launchpad;

	var launchpadElement = document.getElementById("launchpad");
	if (launchpad && launchpadElement) {
		launchpad.init(launchpadElement);
	
		window.windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
	}
}

window.addEventListener("load", init, false);
