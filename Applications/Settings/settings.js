
Loader.onVulpOS(function(os) {
	var container = document.getElementById("content");
	if (!container) return;

	var extensions = os.wm.extensions;


	var list = os.createInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));

	container.appendChild(list);

	/** @type {Flags} */
	var f = os.flags;
	var flagsList = os.createInputList((Object.keys(f).map(function (key) {
		var flag = f[key] || false;
		return { label: os.Helpers.formatCamelCase(key), state: flag, onInput: function (enabled) { f[key] = enabled; }};
	})));
	container.appendChild(flagsList);
});
