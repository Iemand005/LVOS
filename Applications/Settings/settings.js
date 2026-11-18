
Loader.onVulpOS(function(os) {
	var extensions = os.wm.extensions;

	var list = os.createInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));
	var main = document.querySelector("main");
	if (main) main.appendChild(list);

	Object.keys(flags).map(function (flag) {
		
	});
});
