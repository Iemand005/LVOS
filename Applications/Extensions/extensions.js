
/** @param {WindowManager} windowManager */
function ExtensionApp(windowManager) {
	this.wm = windowManager;
}

/** @param {Extension[]} extensions */
ExtensionApp.prototype.createList = function (extensions) {
	var list = document.createElement("ul");
	for (var extensionId in extensions) {
		var extension = extensions[extensionId];
		if (!extension) return;
		var item = document.createElement("li");
		item.textContent = extension.name;
		list.appendChild(item);
	}
};

LVMessenger.get("os", function(os) {
	console.log("YO I got that thing and woah intellicode is working!??", os);
	var extensions = os.windowManager.extensions;
	createList(extensions);
});

