
var launchpad = new Launchpad();

if (window.windows) window.windows.forEach(dialog => {
	if (dialog.application) launchpad.addApp(dialog.application);
});