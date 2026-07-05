
var launchpad = new Launchpad();

if (windowManager.windows) windowManager.forEachWindow(dialog => {
	if (dialog.application) launchpad.addApp(dialog.application);
});