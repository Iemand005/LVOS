
Loader.onVulpOS(function(os) {
	var content = document.getElementById("content");
	if (!content) return;

	var extPage = os.newTag()
	.addHeader("Extensions").addList(os.wm.extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}));

	var flagsPage = os.newTag()
	.addHeader("Flags").addList((Object.keys(os.flags).map(function (key) {
		return key.charAt(0) !== "_" ? { label: os.Helpers.formatCamelCase(key), state: os.flags[key] || false, onInput: function (enabled) { os.flags[key] = enabled; }} : undefined;
	})));

	os.to(document.getElementById("root"))
	.addHeader("General").addNavList([
		{label: "Extensions", element: extPage.container},
		{label: "Flags", element: flagsPage.container}
	], content);
});
