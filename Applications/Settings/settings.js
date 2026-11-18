
Loader.onVulpOS(function(os) {
	var container = document.getElementById("content");
	if (!container) return;

	var extensions = os.wm.extensions;

	container.appendChild(os.createHeader("Extensions"));

	var list = os.createInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));

	container.appendChild(list);

	container.appendChild(os.createHeader("Flags"));

	/** @type {Flags} */
	var f = os.flags;
	var flagsList = os.createInputList((Object.keys(f).map(function (key) {
		return key.charAt(0) !== "_" ? { label: os.Helpers.formatCamelCase(key), state: f[key] || false, onInput: function (enabled) { f[key] = enabled; }} : undefined;
	})));
	container.appendChild(flagsList);
});
