
Loader.onVulpOS(function(os) {
	var content = document.getElementById("content");
	if (!content) return;
	
	var extPage = os.newTag()
	.addHeader("Extensions").addInputList(os.wm.extensions.map(function (extension) {
		return { label: extension.name, state: extension.enabled || false, onInput: function (enabled) {
			os.wm.toggleExtensionEnabled(extension, enabled);
		}};
	}))
	var flagsPage = os.newTag()
	.addHeader("Flags").addInputList((Object.keys(os.flags).map(function (key) {
		return key.charAt(0) !== "_" ? { label: os.Helpers.formatCamelCase(key), state: os.flags[key] || false, onInput: function (enabled) { os.flags[key] = enabled; }} : undefined;
	})));

	os.to(document.getElementById("root"))
	.addHeader("General").addNavList([
		{label: "Flags", element: flagsPage.container},
		{label: "Extensions", element: extPage.container}
	], content);

	.addHeader("General").addInputList([
		{label: "Flags", onClick: function () {
			if (content) content.replaceChildren(flagsPage.container);
		}},
		{label: "Extensions", onClick: function () {
			if (content) content.replaceChildren(extPage.container);
		}}
	]);
});
