
Loader.onVulpOS(function(os) {
	var container = document.getElementById("content");
	if (!container) return;
	new UIBuilder(container).addHeader("Extensions").addInputList(os.wm.extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	})).addHeader("Flags").addInputList((Object.keys(os.flags).map(function (key) {
		return key.charAt(0) !== "_" ? { label: os.Helpers.formatCamelCase(key), state: os.flags[key] || false, onInput: function (enabled) { os.flags[key] = enabled; }} : undefined;
	})));
});
