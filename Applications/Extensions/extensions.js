
function createList() {

}

LVMessenger.get("os", function(os) {
	console.log("YO I got that thing and woah intellicode is working!??", os);
	var list = document.createElement("ul");
	var extensions = os.windowManager.extensions;
	for (var extensionId in extensions) {
		var extension = extensions[extensionId];
		var item = document.createElement("li");
		list.appendChild(item);
	}
});