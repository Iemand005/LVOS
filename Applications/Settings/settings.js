
Loader.onVulpOS(function(os) {
	var extensions = os.wm.extensions;

	var list = os.createInputList(extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));
	var main = document.querySelector("main");
	if (main) main.appendChild(list);

	/** @type {Flags} */
	var f = flags;
	Object.keys(f).map(function (key) {
		var flag = f[key];
		if (!flag) return;
		return { label: flag.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	});
});
