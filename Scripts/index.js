
var launchpad = new Launchpad();

function init() {

	var launchpadElement = document.getElementById("launchpad");
	if (launchpadElement) {
		launchpad.init(launchpadElement);
	
		windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog.application);
		});
	}
	}

window.addEventListener("load", init, false);
