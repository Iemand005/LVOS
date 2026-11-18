
/** @param {VulpOS} os */
function ExtensionApp(os) {
	this.os = os;
}

ExtensionApp.prototype.createList = function () {
	var extensions = this.wm.extensions;
	var list = document.createElement("ul");
	for (var extensionId in extensions) {
		var extension = extensions[extensionId];
		if (!extension) return;
		var item = document.createElement("li");
		item.appendChild(document.createTextNode(extension.name));
		var toggle = document.createElement("input");
		toggle.type = "checkbox";
		toggle.checked = !!extension.enabled;
		var self = this;
		toggle.onclick = function () {
			if (!extension) return;
			self.wm.toggleExtensionEnabled(extension);
		};
		item.appendChild(toggle);
		list.appendChild(item);
	}
	var main = document.querySelector("main");
	if (main) main.appendChild(list);
};

LVMessenger.get("os", function(os) {
	var app = new ExtensionApp(os);
	app.createList();
});

