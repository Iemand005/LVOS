type DialogEvent = { dialog: Dialog };

interface Extension {
	onWindowLaunch(dialog: Dialog);
	onWindowMove(dialog: Dialog);
}