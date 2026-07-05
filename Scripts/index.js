
var launchpad = new Launchpad();

windowManager.forEachWindow(function(dialog) {
	if (dialog.application) launchpad.addApp(dialog.application);
});