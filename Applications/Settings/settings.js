
Loader.onVulpOS(function(os) {
	var container = document.getElementById("content");
	if (!container) return;

	var extensions = os.wm.extensions;

	container.appendChild(os.createHeader("Extensions"));
	container.appendChild(os.createInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	})));
	container.appendChild(os.createHeader("Flags"));
	container.appendChild(os.createInputList((Object.keys(os.flags).map(function (key) {
		return key.charAt(0) !== "_" ? { label: os.Helpers.formatCamelCase(key), state: os.flags[key] || false, onInput: function (enabled) { os.flags[key] = enabled; }} : undefined;
	}))));
});
