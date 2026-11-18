
Loader.onVulpOS(function(os) {
	var main = document.querySelector("main");
	if (!main) return;

	var extensions = os.wm.extensions;


	var list = os.createInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));

	main.appendChild(list);

	/** @type {Flags} */
	var f = os.flags;
	var flagsList = os.createInputList((Object.keys(f).map(function (key) {
		var flag = f[key] || false;
		return { label: Helpers.formatCamelCase(key), state: flag, onInput: function (enabled) { f[key] = enabled; }};
	})));
	main.appendChild(flagsList);
});
