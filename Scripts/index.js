
var launchpad = new Launchpad();

function init() {

	var launchpadElement = document.getElementById("launchpad");
	if (launchpadElement) {
		launchpad.init(launchpadElement);
	
		window.windowManager.forEachWindow(function(dialog) {
			if (dialog.application) launchpad.addApp(dialog);
		});
	}
	}

window.addEventListener("load", init, false);
