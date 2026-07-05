
var launchpad = new Launchpad();

function init() {
	windowManager.forEachWindow(function(dialog) {
		if (dialog.application) launchpad.addApp(dialog.application);
	});
}

window.addEventListener("load", init, false);
