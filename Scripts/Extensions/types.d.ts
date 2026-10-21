type DialogEvent = { dialog: Dialog };

interface Extension {
	onWindowMove(dialog: Dialog);
}