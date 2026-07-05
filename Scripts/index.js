
var launchpad = new Launchpad();

if (windowManager) windowManager.forEachWindow(dialog => {
	if (dialog.application) launchpad.addApp(dialog.application);
});