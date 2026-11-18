
LVMessenger.get("os", function(os) {
	var app = new ExtensionApp(os);
	app.createList();
});
