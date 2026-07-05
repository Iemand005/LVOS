
var launchpad = new Launchpad();

windowManager.forEachWindow(dialog => {
	if (dialog.application) launchpad.addApp(dialog.application);
});