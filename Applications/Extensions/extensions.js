
Loader.onVulpOS(function(os) {
	os.to(document.querySelector("main")).addInputList(os.wm.extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));
});