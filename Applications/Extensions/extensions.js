
Loader.onVulpOS(function(os) {
	var extensions = os.wm.extensions;
	os.to(document.querySelector("main")).addInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));
});