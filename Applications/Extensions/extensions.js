
/** @param {VulpOS} os */
function ExtensionApp(os) {
	this.os = os;
}

ExtensionApp.prototype.createList = function () {
	var extensions = this.os.wm.extensions;

	this.os.createInputList(extensions.map(function (extension) {
		return { state: extension.enabled || false, onInput: function (enabled) {

		}};
	}));
	var main = document.querySelector("main");
	if (main) main.appendChild(list);
};

LVMessenger.get("os", function(os) {
	var app = new ExtensionApp(os);
	app.createList();
});

