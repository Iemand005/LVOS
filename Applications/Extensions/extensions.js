

LVMessenger.get("os", function(os) {
	console.log("YO I got that thing and woah intellicode is working!??", os);
	var extensions = os.windowManager.extensions;
	for (var extensionId in extensions) {
		var extension = extensions[extensionId];
		
	}
});