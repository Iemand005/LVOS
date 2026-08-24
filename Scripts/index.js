/** @type {Launchpad?} */
var launchpad = null;

function init() {
	launchpad = new Launchpad();

	var launchpadElement = document.getElementById("launchpad");
	if (launchpadElement) {
		launchpad.init(launchpadElement);
	
		window.windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
	}
}

window.addEventListener("load", init, false);
