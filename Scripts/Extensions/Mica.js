
// TODO: make a standardplugin thing and a way to enforce exts to conform to it, do I make it a json object then? not really class based?

/** @type {Extension} */
var micaExtension = {
	onWindowMove: function(dialog) {

	}
};

window.windowManager.registerExtension(micaExtension);