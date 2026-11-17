
/** @param {WindowManager} wm */
function ExtensionApp(wm) {
	this.wm = wm;
}

ExtensionApp.prototype.createList = function () {
	var extensions = this.wm.extensions;
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
	var ea = new ExtensionApp(os.windowManager);
	ea.createList();
});

